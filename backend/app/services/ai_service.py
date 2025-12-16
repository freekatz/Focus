"""
AI 服务 - 封装 LLM 调用

支持的提供商（通过 LangChain 统一接口）：
- openai: OpenAI API
- gemini: Google Gemini API（使用原生 Google AI API，非 OpenAI 兼容）
- anthropic: Anthropic API
- ollama: 本地 Ollama 服务
- openai_compatible: OpenAI 兼容接口（OpenRouter, DeepSeek 等）
"""
from app.models.user_config import UserConfig
from app.models.entry import Entry
from app.agents.sage import Sage
from app.utils.logger import logger


class AIService:
    """
    AI 服务

    根据用户配置创建 LLM 实例，并提供 AI 相关功能。
    支持多种 AI 提供商：OpenAI、Gemini、Anthropic、Ollama 及 OpenAI 兼容接口。
    """

    def __init__(self, config: UserConfig):
        """
        初始化 AI 服务

        Args:
            config: 用户配置
        """
        self.config = config
        self.llm = self._create_llm()
        self.sage = Sage(self.llm, custom_prompt=config.sage_prompt)

    def _create_llm(self):
        """根据配置创建 LLM 实例"""
        provider = self.config.ai_provider.lower()

        if provider == "openai":
            return self._create_openai_llm()

        elif provider == "gemini":
            return self._create_gemini_llm()

        elif provider == "anthropic":
            return self._create_anthropic_llm()

        elif provider == "ollama":
            return self._create_ollama_llm()

        elif provider == "openai_compatible":
            return self._create_openai_compatible_llm()

        else:
            # 默认使用 OpenAI 兼容接口
            logger.warning(f"Unknown AI provider '{provider}', falling back to OpenAI compatible API")
            return self._create_openai_compatible_llm()

    def _create_openai_llm(self):
        """创建 OpenAI LLM"""
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=self.config.ai_model or "gpt-4o-mini",
            api_key=self.config.ai_api_key,
            base_url=self.config.ai_base_url,  # 可选，用于代理
            temperature=0.9,
        )

    def _create_gemini_llm(self):
        """创建 Google Gemini LLM"""
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI

            return ChatGoogleGenerativeAI(
                model=self.config.ai_model or "gemini-1.5-flash",
                google_api_key=self.config.ai_api_key,
                temperature=0.9,
                convert_system_message_to_human=True,  # Gemini 不支持 system message
            )
        except ImportError:
            logger.error("langchain-google-genai not installed. Run: pip install langchain-google-genai")
            raise ImportError("请安装 langchain-google-genai: pip install langchain-google-genai")

    def _create_anthropic_llm(self):
        """创建 Anthropic Claude LLM"""
        try:
            from langchain_anthropic import ChatAnthropic

            return ChatAnthropic(
                model=self.config.ai_model or "claude-3-haiku-20240307",
                api_key=self.config.ai_api_key,
                temperature=0.9,
            )
        except ImportError:
            logger.error("langchain-anthropic not installed. Run: pip install langchain-anthropic")
            raise ImportError("请安装 langchain-anthropic: pip install langchain-anthropic")

    def _create_ollama_llm(self):
        """创建本地 Ollama LLM"""
        try:
            from langchain_ollama import ChatOllama

            return ChatOllama(
                model=self.config.ai_model or "llama3.2",
                base_url=self.config.ai_base_url or "http://localhost:11434",
                temperature=0.9,
            )
        except ImportError:
            # 回退到旧版导入
            from langchain_community.chat_models import ChatOllama

            return ChatOllama(
                model=self.config.ai_model or "llama3.2",
                base_url=self.config.ai_base_url or "http://localhost:11434",
                temperature=0.9,
            )

    def _create_openai_compatible_llm(self):
        """创建 OpenAI 兼容 API 的 LLM（如 OpenRouter, DeepSeek, vLLM 等）"""
        from langchain_openai import ChatOpenAI

        if not self.config.ai_base_url:
            logger.warning("OpenAI compatible API requires base_url")

        return ChatOpenAI(
            model=self.config.ai_model,
            api_key=self.config.ai_api_key,
            base_url=self.config.ai_base_url,
            temperature=0.9,
        )

    async def summarize_entry(self, entry: Entry) -> dict:
        """
        生成文章总结

        Args:
            entry: 文章条目

        Returns:
            包含 summary, content_type, processing_time 的字典
        """
        source_name = entry.rss_source.name if entry.rss_source else "Unknown"

        result = await self.sage.analyze(
            title=entry.title,
            source=source_name,
            content=entry.content or "",
        )

        return result.to_dict()
