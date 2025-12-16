"""
智者（Sage）智能体

统一的 AI 智能体，负责内容分类和总结。
分类和总结在同一个请求中完成，使用单一提示词。
"""
import json
import time
from typing import Optional

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.agents.prompts import SAGE_SYSTEM_PROMPT, SAGE_HUMAN_PROMPT
from app.utils.logger import logger


class SageResult:
    """智者处理结果"""

    def __init__(self, content_type: str, summary: str, processing_time: float):
        self.content_type = content_type
        self.summary = summary
        self.processing_time = processing_time

    def to_dict(self) -> dict:
        return {
            "content_type": self.content_type,
            "summary": self.summary,
            "processing_time": self.processing_time,
        }


class Sage:
    """
    智者智能体

    统一处理内容分类和总结，使用单一提示词完成所有工作。
    """

    def __init__(self, llm, custom_prompt: Optional[str] = None):
        """
        初始化智者

        Args:
            llm: LangChain LLM 实例
            custom_prompt: 自定义提示词（如果为 None，使用默认提示词）
        """
        self.llm = llm
        self.prompt_template = custom_prompt or SAGE_HUMAN_PROMPT
        self.output_parser = StrOutputParser()

        # 构建 prompt
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", SAGE_SYSTEM_PROMPT),
            ("human", self.prompt_template),
        ])

    async def analyze(
        self,
        title: str,
        source: str,
        content: str,
        max_content_length: int = 3000,
    ) -> SageResult:
        """
        分析文章内容

        Args:
            title: 文章标题
            source: 来源名称
            content: 文章内容
            max_content_length: 最大内容长度（截断）

        Returns:
            SageResult: 包含 content_type 和 summary 的结果
        """
        start_time = time.time()

        # 截断过长内容
        if len(content) > max_content_length:
            content = content[:max_content_length] + "..."

        try:
            # 构建处理链
            chain = self.prompt | self.llm | self.output_parser

            # 调用 LLM
            result = await chain.ainvoke({
                "title": title,
                "source": source,
                "content": content,
            })
            # 解析 JSON 结果
            parsed = self._parse_result(result)
            processing_time = time.time() - start_time
            logger.info(f"Sage analyzed '{title[:30]}...' in {processing_time:.2f}s")

            return SageResult(
                content_type=parsed.get("content_type", "other"),
                summary=parsed.get("summary", "无法生成总结"),
                processing_time=processing_time,
            )

        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Sage analysis failed for '{title[:30]}...': {e}")

            return SageResult(
                content_type="other",
                summary=f"分析失败: {str(e)}",
                processing_time=processing_time,
            )

    def _parse_result(self, result: str) -> dict:
        """
        解析 LLM 返回的 JSON 结果

        Args:
            result: LLM 返回的字符串

        Returns:
            解析后的字典
        """
        # 尝试提取 JSON 块
        result = result.strip()

        # 处理 markdown 代码块
        if "```json" in result:
            start = result.find("```json") + 7
            end = result.find("```", start)
            if end > start:
                result = result[start:end].strip()
        elif "```" in result:
            start = result.find("```") + 3
            end = result.find("```", start)
            if end > start:
                result = result[start:end].strip()

        try:
            parsed = json.loads(result)
            if isinstance(parsed, dict):
                return self._normalize_result(parsed)
            # JSON 解析成功但不是字典（可能是字符串或其他类型）
            return {
                "content_type": "other",
                "summary": str(parsed)[:500] if parsed else "无法解析结果",
            }
        except json.JSONDecodeError:
            # 尝试修复常见的 JSON 问题
            try:
                # 尝试找到 JSON 对象
                start = result.find("{")
                end = result.rfind("}") + 1
                if start >= 0 and end > start:
                    parsed = json.loads(result[start:end])
                    if isinstance(parsed, dict):
                        return self._normalize_result(parsed)
            except:
                pass

            logger.warning(f"Failed to parse JSON result: {result[:200]}...")
            return {
                "content_type": "other",
                "summary": result[:500] if result else "无法解析结果",
            }

    def _normalize_result(self, parsed: dict) -> dict:
        """
        确保结果格式正确，summary 必须是字符串

        Args:
            parsed: 解析后的字典

        Returns:
            标准化后的字典
        """
        summary = parsed.get("summary", "")

        # 如果 summary 是字典，转换为字符串
        if isinstance(summary, dict):
            parts = []
            if "research_problem" in summary:
                parts.append(f"研究问题：{summary['research_problem']}")
            if "method" in summary:
                parts.append(f"方法：{summary['method']}")
            if "findings" in summary or "contribution" in summary:
                findings = summary.get("findings") or summary.get("contribution", "")
                parts.append(f"主要贡献：{findings}")
            if "keywords" in summary:
                keywords = summary["keywords"]
                if isinstance(keywords, list):
                    parts.append(f"关键词：{', '.join(keywords)}")
                else:
                    parts.append(f"关键词：{keywords}")

            # 如果没有识别到特定字段，直接序列化
            if not parts:
                summary = json.dumps(summary, ensure_ascii=False)
            else:
                summary = " ".join(parts)

        parsed["summary"] = str(summary) if summary else "无法生成总结"
        return parsed
