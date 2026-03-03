"""
ArXiv 论文深度解读服务
完全参考 refer/arxiv_reader.py 实现

功能：
1. 从 arXiv HTML 版本获取论文全文
2. 使用 Q1-Q6 框架进行两轮深度解读
3. 合并输出 Markdown 格式解读
4. 摘要翻译（中文）
5. 支持多模型配置和失败自动切换
"""
import re
from typing import Optional
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup
from openai import AsyncOpenAI

from app.models.entry import Entry
from app.models.user_config import UserConfig
from app.agents.arxiv_prompts import (
    ARXIV_ANALYSIS_PROMPT,
    ROUND1_USER_PROMPT,
    ROUND2_USER_PROMPT,
)
from app.services.ai_executor import (
    create_executor_for_translation,
    create_executor_for_interpret,
)
from app.utils.logger import logger


class NoHtmlAvailableError(Exception):
    """ArXiv 论文没有 HTML 版本（404 错误）"""
    pass


# API 请求超时配置（秒）
API_TIMEOUT = 120.0


async def validate_ai_api_key(api_key: str, base_url: str = None, model: str = None) -> dict:
    """
    验证 AI API Key 是否有效

    通过发送一个简单的测试请求来验证 API Key

    Args:
        api_key: API Key
        base_url: API Base URL（可选）
        model: 模型名称（可选，默认使用简单模型）

    Returns:
        dict: {"valid": bool, "error": str | None, "model": str | None}
    """
    if not api_key:
        return {"valid": False, "error": "API Key is empty", "model": None}

    try:
        client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url if base_url else None,
            timeout=30.0,  # 验证时使用较短超时
        )

        # 使用简单请求测试 API Key
        test_model = model or "gpt-3.5-turbo"
        response = await client.chat.completions.create(
            model=test_model,
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5,
        )

        # 验证成功
        actual_model = response.model if response else test_model
        logger.info(f"AI API Key validation successful, model: {actual_model}")
        return {"valid": True, "error": None, "model": actual_model}

    except Exception as e:
        error_msg = str(e)
        # 解析常见错误
        if "401" in error_msg or "Unauthorized" in error_msg or "invalid_api_key" in error_msg:
            error_msg = "Invalid API Key"
        elif "404" in error_msg or "model_not_found" in error_msg:
            error_msg = f"Model not found: {model}"
        elif "timeout" in error_msg.lower():
            error_msg = "API request timeout - please check your network or API endpoint"
        elif "connection" in error_msg.lower():
            error_msg = "Cannot connect to API endpoint - please check base_url"

        logger.warning(f"AI API Key validation failed: {error_msg}")
        return {"valid": False, "error": error_msg, "model": None}


def is_arxiv_entry(entry: Entry) -> bool:
    """判断是否为 ArXiv 文章"""
    if entry.link and "arxiv.org" in entry.link:
        return True
    if entry.rss_source and entry.rss_source.name:
        if "arxiv" in entry.rss_source.name.lower():
            return True
    if entry.rss_source_name:
        if "arxiv" in entry.rss_source_name.lower():
            return True
    return False


def extract_arxiv_id(url: str) -> Optional[str]:
    """从 URL 提取 arXiv ID"""
    patterns = [
        r'arxiv\.org/(?:abs|pdf|html)/(\d+\.\d+)',
        r'arxiv:(\d+\.\d+)',
        r'^(\d+\.\d+)(?:v\d+)?(?:\.pdf)?$',
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def normalize_markdown_emphasis(text: str) -> str:
    """
    规范化 Markdown 文本中的连续强调标记

    将 **text1**向**text2** 改为 **text1** 向 **text2**
    确保加粗标记后面的中文连接词、字母、数字前有适当间距

    Args:
        text: 需要规范化的 Markdown 文本

    Returns:
        规范化后的文本

    注意:
        只处理 **text** 后面紧跟的字符，不处理前面的字符
        这样可以避免破坏已有的正确格式
    """
    if not text:
        return text

    # 模式 1: **text** 后紧跟中文连接词时添加空格
    # **text**和 -> **text** 和
    # **text** 和 -> 保持不变（negative lookahead 检查后面不是空格）
    text = re.sub(
        r'\*\*([^*]+)\*\*(?!\s)([和、与及或向至对于关于从到])',
        r'**\1** \2',
        text
    )

    # 模式 2: **text** 后紧跟英文字母时添加空格（避免粘连）
    # **text**A -> **text** A
    # **text** A -> 保持不变
    # 但排除紧跟 ** 的情况（那是另一个加粗的开始）
    text = re.sub(
        r'\*\*([^*]+)\*\*(?!\s)(?!\*)([A-Za-z])',
        r'**\1** \2',
        text
    )

    # 模式 3: **text** 后紧跟数字时添加空格
    # **text**123 -> **text** 123
    # **text** 123 -> 保持不变
    text = re.sub(
        r'\*\*([^*]+)\*\*(?!\s)(\d)',
        r'**\1** \2',
        text
    )

    # 模式 4: **text** 后紧跟左括号时添加空格
    # **text**（ -> **text** （
    # **text** （ -> 保持不变
    text = re.sub(
        r'\*\*([^*]+)\*\*(?!\s)([（\(])',
        r'**\1** \2',
        text
    )

    return text


class ArxivTranslator:
    """ArXiv 摘要翻译器 - 支持多模型配置和失败自动切换"""

    def __init__(self, config: UserConfig):
        """
        初始化翻译器

        Args:
            config: 用户配置
        """
        self.config = config
        self.executor = create_executor_for_translation(config)

        # 如果新配置为空，回退到旧配置（兼容性）
        if not self.executor:
            self.client = AsyncOpenAI(
                api_key=config.ai_api_key,
                base_url=config.ai_base_url if config.ai_base_url else None,
                timeout=API_TIMEOUT,
            )
            self.model = config.ai_model

    async def translate_and_summarize(self, abstract: str, title: str) -> tuple[str, str]:
        """
        一次 LLM 调用同时完成翻译和总结，支持失败自动切换

        Args:
            abstract: 英文摘要
            title: 论文标题

        Returns:
            (翻译后的摘要, 简要总结)
        """
        if not abstract or not abstract.strip():
            return "", ""

        async def _translate_task(client: AsyncOpenAI, model: str) -> tuple[str, str]:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": """你是一位专业的学术论文阅读助手。请完成以下两个任务：

1. 要点总结（约80-120字）：简明概括论文的核心贡献和创新点，帮助读者快速判断是否值得深入阅读
2. 摘要翻译：将摘要准确翻译成中文，保持学术专业性

按以下格式输出（使用XML标签）：
<summary>要点总结内容</summary>
<translation>翻译内容</translation>"""
                    },
                    {
                        "role": "user",
                        "content": f"标题: {title}\n\n摘要: {abstract}"
                    }
                ],
                max_tokens=2500,
                temperature=0.3,
            )

            content = response.choices[0].message.content
            summary = self._extract_tag(content, "summary")
            translation = self._extract_tag(content, "translation")

            # 规范化 Markdown 格式
            summary = normalize_markdown_emphasis(summary)
            translation = normalize_markdown_emphasis(translation)

            return translation, summary

        try:
            if self.executor:
                # 使用新的多模型执行器
                return await self.executor.execute(_translate_task, "ArXiv Translator")
            else:
                # 回退到旧配置
                return await _translate_task(self.client, self.model)
        except Exception as e:
            logger.error(f"[ArXiv Translator] Translation failed: {e}")
            raise

    def _extract_tag(self, text: str, tag: str) -> str:
        """从文本中提取 XML 标签内容"""
        pattern = f"<{tag}>(.*?)</{tag}>"
        match = re.search(pattern, text, re.DOTALL)
        return match.group(1).strip() if match else ""


class ArxivInterpreter:
    """ArXiv 论文解读器 - 支持多模型配置和失败自动切换"""

    def __init__(self, config: UserConfig):
        """
        初始化解读器

        Args:
            config: 用户配置
        """
        self.config = config
        self.executor = create_executor_for_interpret(config)

        # 如果新配置为空，回退到旧配置（兼容性）
        if not self.executor:
            self.client = AsyncOpenAI(
                api_key=config.ai_api_key,
                base_url=config.ai_base_url if config.ai_base_url else None,
                timeout=API_TIMEOUT,
            )
            self.model = config.ai_model

    async def interpret(self, entry: Entry) -> str:
        """
        两轮对话解读论文 - 支持失败自动切换

        Args:
            entry: 文章条目

        Returns:
            Markdown 格式的深度解读
        """
        # 1. 获取论文完整内容（必须从 ArXiv HTML 获取，不接受 RSS content）
        paper_content = await self._fetch_arxiv_html(entry.link)
        if not paper_content:
            error_msg = f"无法获取 ArXiv 论文 HTML 内容: {entry.link}"
            logger.error(f"[ArXiv Interpreter] {error_msg}")
            raise RuntimeError(error_msg)

        async def _interpret_task(client: AsyncOpenAI, model: str) -> str:
            # 2. 第一轮：Q1-Q6 框架解读
            logger.info(f"[ArXiv Interpreter] Round 1: Q1-Q6 framework for '{entry.title[:50]}...'")

            round1_prompt = ROUND1_USER_PROMPT.format(
                title=entry.title,
                content=paper_content
            )

            messages = [
                {"role": "system", "content": ARXIV_ANALYSIS_PROMPT},
                {"role": "user", "content": round1_prompt}
            ]

            result_1 = await self._call_llm_with_client(client, model, messages)

            # 3. 第二轮：评价指标、损失函数、数据集
            logger.info(f"[ArXiv Interpreter] Round 2: Metrics, Loss, Datasets")

            messages.append({"role": "assistant", "content": result_1})
            messages.append({"role": "user", "content": ROUND2_USER_PROMPT})

            result_2 = await self._call_llm_with_client(client, model, messages)

            # 4. 合并结果（Markdown 拼接）
            combined = result_1 + "\n\n" + result_2

            # 规范化 Markdown 格式
            combined = normalize_markdown_emphasis(combined)

            logger.info(f"[ArXiv Interpreter] Completed interpretation for '{entry.title[:50]}...'")

            return combined

        try:
            if self.executor:
                # 使用新的多模型执行器
                return await self.executor.execute(_interpret_task, "ArXiv Interpreter")
            else:
                # 回退到旧配置
                return await _interpret_task(self.client, self.model)
        except Exception as e:
            logger.error(f"[ArXiv Interpreter] Interpretation failed: {e}")
            raise

    async def _call_llm_with_client(self, client: AsyncOpenAI, model: str, messages: list) -> str:
        """使用指定客户端调用 LLM"""
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.3,
        )
        return response.choices[0].message.content

    async def _call_llm(self, messages: list) -> str:
        """调用 LLM - 兼容旧代码"""
        try:
            return await self._call_llm_with_client(self.client, self.model, messages)
        except Exception as e:
            logger.error(f"[ArXiv Interpreter] LLM call failed: {e}")
            raise

    async def _fetch_arxiv_html(self, url: str) -> Optional[str]:
        """
        从 arXiv 获取论文 HTML 并转为 Markdown
        完全参考 ArxivPaper.fetch_content() 和 _extract_* 方法
        """
        arxiv_id = extract_arxiv_id(url)
        if not arxiv_id:
            logger.warning(f"Could not extract arXiv ID from URL: {url}")
            return None

        html_url = f"https://arxiv.org/html/{arxiv_id}"

        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(html_url, headers=headers, follow_redirects=True)
                response.raise_for_status()
                html_content = response.text
                # 使用实际响应 URL 作为基准（跟随重定向后的地址，如 /html/2603.02049v1/）
                self._base_url = str(response.url)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.info(f"ArXiv HTML not available (404): {html_url}")
                raise NoHtmlAvailableError(f"HTML version not available for {arxiv_id}")
            logger.warning(f"Failed to fetch arXiv HTML (HTTP {e.response.status_code}): {e}")
            return None
        except httpx.HTTPError as e:
            logger.warning(f"Failed to fetch arXiv HTML: {e}")
            return None

        # 解析 HTML
        soup = BeautifulSoup(html_content, "html.parser")

        content_parts = []

        # 摘要
        abstract = soup.find("div", class_="ltx_abstract")
        if abstract:
            content_parts.append("## Abstract\n" + self._extract_text(abstract))

        # 正文章节
        article = soup.find("article", class_="ltx_document")
        if article:
            sections = article.find_all("section", class_="ltx_section")
            for section in sections:
                section_text = self._extract_section(section)
                if section_text:
                    content_parts.append(section_text)

        # 参考文献
        bibliography = soup.find("section", class_="ltx_bibliography")
        if bibliography:
            content_parts.append("## References\n" + self._extract_text(bibliography))

        return "\n\n".join(content_parts)

    def _extract_section(self, section, level: int = 2) -> str:
        """递归提取章节内容，支持深层嵌套"""
        parts = []
        md_prefix = "#" * level

        # 查找当前层级的标题
        title_classes = {
            2: ("h2", "ltx_title_section"),
            3: ("h3", "ltx_title_subsection"),
            4: ("h4", "ltx_title_subsubsection"),
            5: ("h5", "ltx_title_paragraph"),
        }

        if level in title_classes:
            tag, cls = title_classes[level]
            title = section.find(tag, class_=cls)
            if title:
                parts.append(f"{md_prefix} {title.get_text(strip=True)}")

        # 查找子章节
        subsection_classes = {
            2: "ltx_subsection",
            3: "ltx_subsubsection",
            4: "ltx_paragraph",
        }

        if level in subsection_classes:
            subsections = section.find_all("section", class_=subsection_classes[level], recursive=False)
            if subsections:
                for subsec in subsections:
                    parts.append(self._extract_section(subsec, level + 1))
            else:
                parts.append(self._extract_text(section))
        else:
            parts.append(self._extract_text(section))

        return "\n\n".join(parts)

    def _extract_math(self, math_elem) -> str:
        """提取数学公式，优先级: annotation > alttext > 原始文本"""
        # 优先从 annotation 标签获取 LaTeX
        annotation = math_elem.find("annotation", attrs={"encoding": "application/x-tex"})
        if annotation:
            return annotation.get_text(strip=True)
        # 其次使用 alttext 属性
        alttext = math_elem.get("alttext", "")
        if alttext:
            return alttext
        # 最后提取纯文本
        return math_elem.get_text(strip=True)

    def _extract_table(self, table_elem) -> str:
        """将 HTML 表格转为 Markdown 格式"""
        table = table_elem.find("table", class_="ltx_tabular") or table_elem.find("table")
        if not table:
            caption = table_elem.find("figcaption")
            return f"[Table: {caption.get_text(strip=True) if caption else 'Table'}]"

        rows = table.find_all("tr")
        if not rows:
            return ""

        md_rows = []
        max_cols = 0

        for row in rows:
            cells = row.find_all(["th", "td"])
            cell_texts = []
            for cell in cells:
                for math in cell.find_all("math"):
                    latex = self._extract_math(math)
                    math.replace_with(f"${latex}$")
                cell_text = cell.get_text(strip=True).replace("|", "\\|").replace("\n", " ")
                cell_texts.append(cell_text)
            max_cols = max(max_cols, len(cell_texts))
            md_rows.append("| " + " | ".join(cell_texts) + " |")

        if md_rows and max_cols > 0:
            separator = "| " + " | ".join(["---"] * max_cols) + " |"
            md_rows.insert(1, separator)

        caption = table_elem.find("figcaption")
        if caption:
            md_rows.insert(0, f"**{caption.get_text(strip=True)}**\n")

        return "\n".join(md_rows)

    def _extract_text(self, element) -> str:
        """提取元素中的文本，保留数学公式、表格、代码块"""
        if element is None:
            return ""

        # 克隆元素以避免修改原始 DOM
        from copy import copy
        element = copy(element)

        # 1. 处理数学公式
        for math in element.find_all("math"):
            latex = self._extract_math(math)
            if latex:
                if math.get("display") == "block":
                    math.replace_with(f"\n$$\n{latex}\n$$\n")
                else:
                    math.replace_with(f"${latex}$")

        # 2. 处理代码块/算法
        for listing in element.find_all("figure", class_="ltx_listing"):
            code = listing.find("pre") or listing.find("code")
            caption = listing.find("figcaption")
            caption_text = f"**{caption.get_text(strip=True)}**\n" if caption else ""
            if code:
                listing.replace_with(f"\n{caption_text}```\n{code.get_text()}\n```\n")
            else:
                listing.replace_with(f"\n{caption_text}[Algorithm]\n")

        # 3. 处理表格 - 转为 Markdown
        for table_fig in element.find_all("figure", class_="ltx_table"):
            md_table = self._extract_table(table_fig)
            table_fig.replace_with(f"\n{md_table}\n")

        # 4. 处理图片引用 - 将相对 URL 转为绝对 URL
        for figure in element.find_all("figure", class_="ltx_figure"):
            caption = figure.find("figcaption")
            caption_text = caption.get_text(strip=True) if caption else "Figure"
            img = figure.find("img")
            img_url = img.get("src", "") if img else ""
            if img_url:
                # 将相对 URL 转为绝对 URL
                if not img_url.startswith(("http://", "https://")):
                    base_url = getattr(self, '_base_url', '')
                    if base_url:
                        img_url = urljoin(base_url, img_url)
                figure.replace_with(f"\n![{caption_text}]({img_url})\n")
            else:
                figure.replace_with(f"\n[Image: {caption_text}]\n")

        # 5. 移除脚注、导航等非核心内容
        for nav in element.find_all(["nav", "footer"]):
            nav.decompose()

        text = element.get_text(separator=" ", strip=True)
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()
