"""
AI 模型执行器

支持多模型配置和失败自动切换功能
"""
import json
from dataclasses import dataclass
from typing import Any, Callable, List, Optional, TypeVar

from openai import AsyncOpenAI

from app.models.user_config import UserConfig
from app.utils.logger import logger


# API 请求超时配置（秒）
API_TIMEOUT = 120.0

T = TypeVar('T')


@dataclass
class AIModelConfig:
    """AI 模型配置"""
    id: str
    name: str
    provider: str
    model: str
    api_key: str
    base_url: Optional[str] = None


def parse_ai_config(config_json: Optional[str]) -> tuple[Optional[AIModelConfig], List[AIModelConfig]]:
    """
    解析 AI 配置 JSON

    Args:
        config_json: JSON 格式的配置字符串

    Returns:
        (primary_config, fallback_configs) 元组
    """
    if not config_json:
        return None, []

    try:
        config = json.loads(config_json)
        primary_data = config.get("primary")
        if not primary_data:
            return None, []

        primary = AIModelConfig(
            id=primary_data.get("id", ""),
            name=primary_data.get("name", ""),
            provider=primary_data.get("provider", "openai"),
            model=primary_data.get("model", ""),
            api_key=primary_data.get("api_key", ""),
            base_url=primary_data.get("base_url"),
        )

        fallbacks = []
        for fb_data in config.get("fallbacks", []):
            fallbacks.append(AIModelConfig(
                id=fb_data.get("id", ""),
                name=fb_data.get("name", ""),
                provider=fb_data.get("provider", "openai"),
                model=fb_data.get("model", ""),
                api_key=fb_data.get("api_key", ""),
                base_url=fb_data.get("base_url"),
            ))

        return primary, fallbacks
    except json.JSONDecodeError:
        logger.error(f"Failed to parse AI config JSON: {config_json[:100]}...")
        return None, []


def get_translation_config(user_config: UserConfig) -> tuple[Optional[AIModelConfig], List[AIModelConfig]]:
    """获取翻译/总结任务的 AI 配置"""
    primary, fallbacks = parse_ai_config(user_config.ai_models_translation)

    # 如果新配置为空，使用旧配置兼容
    if not primary and user_config.ai_api_key:
        primary = AIModelConfig(
            id="legacy",
            name="默认模型",
            provider=user_config.ai_provider or "openai",
            model=user_config.ai_model or "gpt-4o-mini",
            api_key=user_config.ai_api_key,
            base_url=user_config.ai_base_url,
        )

    return primary, fallbacks


def get_interpret_config(user_config: UserConfig) -> tuple[Optional[AIModelConfig], List[AIModelConfig]]:
    """获取解读任务的 AI 配置"""
    primary, fallbacks = parse_ai_config(user_config.ai_models_interpret)

    # 如果新配置为空，使用旧配置兼容
    if not primary and user_config.ai_api_key:
        primary = AIModelConfig(
            id="legacy",
            name="默认模型",
            provider=user_config.ai_provider or "openai",
            model=user_config.ai_model or "gpt-4o-mini",
            api_key=user_config.ai_api_key,
            base_url=user_config.ai_base_url,
        )

    return primary, fallbacks


class AIModelExecutor:
    """
    AI 模型执行器

    支持多模型配置，失败时自动切换到备用模型
    """

    def __init__(self, primary: AIModelConfig, fallbacks: Optional[List[AIModelConfig]] = None):
        """
        初始化执行器

        Args:
            primary: 主模型配置
            fallbacks: 备用模型配置列表
        """
        self.models = [primary] + (fallbacks or [])
        self.current_index = 0

    def _create_client(self, model_config: AIModelConfig) -> AsyncOpenAI:
        """创建 OpenAI 客户端"""
        return AsyncOpenAI(
            api_key=model_config.api_key,
            base_url=model_config.base_url if model_config.base_url else None,
            timeout=API_TIMEOUT,
        )

    def _should_switch(self, error: Exception) -> bool:
        """
        判断是否应该切换到备用模型

        切换条件：
        - 401: API Key 无效
        - 404: 模型不存在
        - 429: 速率限制
        - 503: 服务不可用
        - timeout: 请求超时
        """
        error_msg = str(error).lower()
        switch_indicators = [
            '401', 'unauthorized', 'invalid_api_key',
            '404', 'model_not_found', 'not found',
            '429', 'rate_limit', 'rate limit',
            '503', 'service_unavailable', 'service unavailable',
            'timeout', 'timed out',
            'connection', 'connect error',
        ]
        return any(indicator in error_msg for indicator in switch_indicators)

    async def execute(
        self,
        task_func: Callable[[AsyncOpenAI, str], T],
        task_name: str = "AI task"
    ) -> T:
        """
        执行 AI 任务，失败时自动切换模型

        Args:
            task_func: 异步任务函数，接收 (client, model_name) 参数
            task_name: 任务名称，用于日志

        Returns:
            任务执行结果

        Raises:
            RuntimeError: 所有模型都失败时抛出
        """
        errors = []

        for i, model_config in enumerate(self.models):
            try:
                client = self._create_client(model_config)
                logger.info(f"[{task_name}] Using model: {model_config.name} ({model_config.model})")
                result = await task_func(client, model_config.model)
                return result
            except Exception as e:
                error_msg = f"{model_config.name}: {str(e)}"
                errors.append(error_msg)
                logger.warning(f"[{task_name}] Model '{model_config.name}' failed: {e}")

                # 检查是否应该切换模型
                if self._should_switch(e) and i < len(self.models) - 1:
                    next_model = self.models[i + 1]
                    logger.info(f"[{task_name}] Switching from '{model_config.name}' to '{next_model.name}'")
                    continue

                # 不应切换或已是最后一个模型，直接抛出
                raise

        # 所有模型都失败
        raise RuntimeError(f"All models failed for {task_name}: {'; '.join(errors)}")


def create_executor_for_translation(user_config: UserConfig) -> Optional[AIModelExecutor]:
    """
    为翻译/总结任务创建执行器

    Args:
        user_config: 用户配置

    Returns:
        AIModelExecutor 实例，如果没有配置则返回 None
    """
    primary, fallbacks = get_translation_config(user_config)
    if not primary:
        return None
    return AIModelExecutor(primary, fallbacks)


def create_executor_for_interpret(user_config: UserConfig) -> Optional[AIModelExecutor]:
    """
    为解读任务创建执行器

    Args:
        user_config: 用户配置

    Returns:
        AIModelExecutor 实例，如果没有配置则返回 None
    """
    primary, fallbacks = get_interpret_config(user_config)
    if not primary:
        return None
    return AIModelExecutor(primary, fallbacks)
