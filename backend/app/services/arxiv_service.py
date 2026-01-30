"""
ArXiv 论文深度解读服务
完全参考 refer/arxiv_reader.py 实现

功能：
1. 从 arXiv HTML 版本获取论文全文
2. 使用 Q1-Q6 框架进行两轮深度解读
3. 合并输出 Markdown 格式解读
4. 摘要翻译（中文）
5. 解读结果保存到本地文件
"""
import os
import re
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

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
from app.utils.logger import logger

# 解读文件保存目录
INTERPRETATIONS_DIR = Path("data/interpretations")

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


class ArxivTranslator:
    """ArXiv 摘要翻译器 - 使用 OpenAI SDK 完全参考 refer/arxiv_reader.py"""

    def __init__(self, config: UserConfig):
        """
        初始化翻译器

        Args:
            config: 用户配置
        """
        self.config = config
        self.client = AsyncOpenAI(
            api_key=config.ai_api_key,
            base_url=config.ai_base_url if config.ai_base_url else None,
            timeout=API_TIMEOUT,
        )
        self.model = config.ai_model

    async def translate_abstract(self, abstract: str) -> str:
        """
        翻译 ArXiv 摘要到中文

        Args:
            abstract: 英文摘要

        Returns:
            中文翻译
        """
        if not abstract or not abstract.strip():
            return ""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是一位专业的学术翻译专家。请将以下英文摘要翻译成中文，保持学术专业性和准确性。直接输出翻译结果，不要添加任何解释或前缀。"
                    },
                    {
                        "role": "user",
                        "content": abstract
                    }
                ],
                max_tokens=2000,
                temperature=0.3,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"[ArXiv Translator] Translation failed: {e}")
            raise

    async def generate_brief_summary(self, abstract: str, title: str) -> str:
        """
        生成简要总结，帮助读者快速抓住要点

        Args:
            abstract: 英文摘要
            title: 论文标题

        Returns:
            简要总结（2-3句话）
        """
        if not abstract or not abstract.strip():
            return ""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": """你是一位学术论文阅读助手。请根据论文标题和摘要，用中文生成一个简短的要点总结，帮助读者快速判断这篇论文是否值得深入阅读。

要求：
1. 总结限制在 2-3 句话以内（约 80-120 字）
2. 突出论文的核心贡献和创新点
3. 使用简洁易懂的语言
4. 直接输出总结内容，不要添加任何前缀或标题"""
                    },
                    {
                        "role": "user",
                        "content": f"标题: {title}\n\n摘要: {abstract}"
                    }
                ],
                max_tokens=300,
                temperature=0.3,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"[ArXiv Translator] Brief summary generation failed: {e}")
            raise

    async def translate_and_summarize(self, abstract: str, title: str) -> tuple[str, str]:
        """
        同时进行翻译和生成简要总结

        Args:
            abstract: 英文摘要
            title: 论文标题

        Returns:
            (翻译后的摘要, 简要总结)
        """
        if not abstract or not abstract.strip():
            return "", ""

        # 并发执行翻译和总结
        translation_task = self.translate_abstract(abstract)
        summary_task = self.generate_brief_summary(abstract, title)

        translation, summary = await asyncio.gather(
            translation_task,
            summary_task,
            return_exceptions=True
        )

        # 处理可能的异常
        if isinstance(translation, Exception):
            logger.error(f"[ArXiv Translator] Translation failed: {translation}")
            raise translation
        if isinstance(summary, Exception):
            logger.error(f"[ArXiv Translator] Summary failed: {summary}")
            # 总结失败不影响翻译结果
            summary = ""

        return translation, summary


class ArxivInterpreter:
    """ArXiv 论文解读器 - 使用 OpenAI SDK 完全参考 refer/arxiv_reader.py"""

    def __init__(self, config: UserConfig):
        """
        初始化解读器

        Args:
            config: 用户配置
        """
        self.config = config
        self.client = AsyncOpenAI(
            api_key=config.ai_api_key,
            base_url=config.ai_base_url if config.ai_base_url else None,
            timeout=API_TIMEOUT,
        )
        self.model = config.ai_model

    async def interpret(self, entry: Entry) -> str:
        """
        两轮对话解读论文 - 完全参考 refer/arxiv_reader.py

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

        result_1 = await self._call_llm(messages)

        # 3. 第二轮：评价指标、损失函数、数据集
        logger.info(f"[ArXiv Interpreter] Round 2: Metrics, Loss, Datasets")

        messages.append({"role": "assistant", "content": result_1})
        messages.append({"role": "user", "content": ROUND2_USER_PROMPT})

        result_2 = await self._call_llm(messages)

        # 4. 合并结果（Markdown 拼接）- 与 refer/arxiv_reader.py 一致
        combined = result_1 + "\n\n" + result_2

        logger.info(f"[ArXiv Interpreter] Completed interpretation for '{entry.title[:50]}...'")

        return combined

    async def _call_llm(self, messages: list) -> str:
        """调用 LLM - 使用 OpenAI SDK 完全参考 refer/arxiv_reader.py"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=16000,
                temperature=0.3,
            )
            return response.choices[0].message.content
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

        # 4. 处理图片引用
        for figure in element.find_all("figure", class_="ltx_figure"):
            caption = figure.find("figcaption")
            caption_text = caption.get_text(strip=True) if caption else "Figure"
            img = figure.find("img")
            img_url = img.get("src", "") if img else ""
            if img_url:
                figure.replace_with(f"\n[Image: {caption_text}]({img_url})\n")
            else:
                figure.replace_with(f"\n[Image: {caption_text}]\n")

        # 5. 移除脚注、导航等非核心内容
        for nav in element.find_all(["nav", "footer"]):
            nav.decompose()

        text = element.get_text(separator=" ", strip=True)
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()


def _sanitize_filename(text: str, max_length: int = 50) -> str:
    """
    将文本转换为安全的文件名

    Args:
        text: 原始文本
        max_length: 最大长度

    Returns:
        安全的文件名字符串
    """
    # 移除或替换不安全的字符
    unsafe_chars = '<>:"/\\|?*\n\r\t'
    for char in unsafe_chars:
        text = text.replace(char, '_')

    # 替换多个连续空格/下划线为单个下划线
    text = re.sub(r'[\s_]+', '_', text)

    # 移除首尾的下划线和空格
    text = text.strip('_ ')

    # 截断到最大长度
    if len(text) > max_length:
        text = text[:max_length].rstrip('_')

    return text or 'untitled'


async def save_interpretation_to_file(entry: Entry, interpretation: str) -> str:
    """
    保存解读结果到本地文件

    文件命名格式: {arxiv_id}_{title_short}_{date}.md
    例如: 2501.12345_Attention_Is_All_You_Need_20250130.md

    Args:
        entry: 文章条目
        interpretation: 解读内容（Markdown 格式）

    Returns:
        保存的文件路径
    """
    # 确保目录存在
    INTERPRETATIONS_DIR.mkdir(parents=True, exist_ok=True)

    # 提取 arxiv_id
    arxiv_id = extract_arxiv_id(entry.link)
    safe_arxiv_id = arxiv_id.replace("/", "_").replace(".", "_") if arxiv_id else f"entry_{entry.id}"

    # 生成安全的标题片段
    title_short = _sanitize_filename(entry.title, max_length=40)

    # 生成日期字符串
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")

    # 组合文件名: arxiv_id_title_date.md
    filename = f"{safe_arxiv_id}_{title_short}_{date_str}.md"
    file_path = INTERPRETATIONS_DIR / filename

    # 格式化发布时间
    pub_time = entry.published_at.strftime("%Y-%m-%d %H:%M") if entry.published_at else 'Unknown'
    interpret_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # 构建完整的 Markdown 内容
    content = f"""# {entry.title}

| 属性 | 值 |
|------|-----|
| ArXiv ID | {arxiv_id or 'N/A'} |
| 来源 | {entry.rss_source_name or 'Unknown'} |
| 作者 | {entry.author or 'Unknown'} |
| 发布时间 | {pub_time} |
| 解读时间 | {interpret_time} |
| 原文链接 | {entry.link} |

---

{interpretation}
"""

    # 写入文件
    file_path.write_text(content, encoding="utf-8")

    logger.info(f"Saved interpretation to {file_path}")

    return str(file_path)
