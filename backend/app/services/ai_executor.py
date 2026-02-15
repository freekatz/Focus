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
    provider_name: str  # 服务商显示名称，如 "Gemini Pro"
    model: str
    api_key: str
    base_url: Optional[str] = None


def parse_unified_ai_config(config_json: Optional[str], task_type: str) -> List[AIModelConfig]:
    """
    从统一 AI 模型 JSON 中解析指定任务的模型列表

    支持两种存储格式:
    1. 新格式 (provider-grouped): {providers: {pid: {..., models: {mid: {...}}}}, tasks: {...}}
    2. 旧格式 (flat models): {models: {id: {...}}, tasks: {...}}

    Args:
        config_json: 统一格式的 JSON 配置字符串
        task_type: 任务类型 ("translation" 或 "interpret")

    Returns:
        有序的模型配置列表（第一个为主模型，其余为备用）
    """
    if not config_json:
        return []

    try:
        data = json.loads(config_json)
        providers_data = data.get("providers", {})
        models_dict = data.get("models", {})
        task_data = data.get("tasks", {}).get(task_type, {})

        # Extract task IDs
        if isinstance(task_data, dict):
            task_ids = task_data.get("model_ids", [])
        elif isinstance(task_data, list):
            task_ids = task_data
        else:
            task_ids = []

        result = []

        if providers_data:
            # New provider-grouped format: compound IDs "pid:mid"
            for compound_id in task_ids:
                if ":" not in compound_id:
                    continue
                pid, mid = compound_id.split(":", 1)
                provider = providers_data.get(pid)
                if not provider or not provider.get("api_key"):
                    continue
                model_entry = provider.get("models", {}).get(mid)
                if not model_entry:
                    continue
                result.append(AIModelConfig(
                    id=compound_id,
                    name=model_entry.get("name", ""),
                    provider=provider.get("provider", "openai"),
                    provider_name=provider.get("name", provider.get("provider", "openai")),
                    model=model_entry.get("model", ""),
                    api_key=provider.get("api_key", ""),
                    base_url=provider.get("base_url"),
                ))
        else:
            # Legacy flat format: plain model IDs
            for model_id in task_ids:
                model_data = models_dict.get(model_id)
                if model_data and model_data.get("api_key"):
                    result.append(AIModelConfig(
                        id=model_id,
                        name=model_data.get("name", ""),
                        provider=model_data.get("provider", "openai"),
                        provider_name=model_data.get("provider", "openai"),
                        model=model_data.get("model", ""),
                        api_key=model_data.get("api_key", ""),
                        base_url=model_data.get("base_url"),
                    ))

        return result
    except json.JSONDecodeError:
        return []


def is_task_enabled(config_json: Optional[str], task_type: str) -> bool:
    """
    检查指定任务是否启用

    Args:
        config_json: 统一格式的 JSON 配置字符串
        task_type: 任务类型 ("translation" 或 "interpret")

    Returns:
        任务是否启用（默认为 True）
    """
    if not config_json:
        return True

    try:
        data = json.loads(config_json)
        task_data = data.get("tasks", {}).get(task_type, {})
        if isinstance(task_data, dict):
            return task_data.get("enabled", True)
        return True  # Legacy format: default to enabled
    except json.JSONDecodeError:
        return True


def get_task_models(user_config: UserConfig, task_type: str) -> List[AIModelConfig]:
    """获取指定任务的模型列表（优先使用统一配置，回退到旧配置）"""
    # 优先使用统一配置
    ai_models_json = getattr(user_config, 'ai_models', None)
    models = parse_unified_ai_config(ai_models_json, task_type)

    if models:
        return models

    # 回退到 legacy 配置
    if user_config.ai_api_key:
        return [AIModelConfig(
            id="legacy",
            name="默认模型",
            provider=user_config.ai_provider or "openai",
            provider_name=user_config.ai_provider or "openai",
            model=user_config.ai_model or "gpt-4o-mini",
            api_key=user_config.ai_api_key,
            base_url=user_config.ai_base_url,
        )]

    return []


def get_translation_config(user_config: UserConfig) -> tuple[Optional[AIModelConfig], List[AIModelConfig]]:
    """获取翻译/总结任务的 AI 配置"""
    models = get_task_models(user_config, "translation")
    if not models:
        return None, []
    return models[0], models[1:]


def get_interpret_config(user_config: UserConfig) -> tuple[Optional[AIModelConfig], List[AIModelConfig]]:
    """获取解读任务的 AI 配置"""
    models = get_task_models(user_config, "interpret")
    if not models:
        return None, []
    return models[0], models[1:]


class AIModelExecutor:
    """
    AI 模型执行器

    实现主备模型模式：
    - 优先使用主模型（列表第一个）
    - 主模型失败时，依次尝试所有备用模型
    - 只有在所有模型都失败后才抛出异常
    - 支持任意数量的备用模型

    示例：
        models = [primary, backup1, backup2]
        executor = AIModelExecutor(primary, [backup1, backup2])

        执行顺序：primary → backup1 → backup2 → raise error
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
        model_names = [f"{m.name}({m.model}) via {m.provider_name}" for m in self.models]
        logger.info(f"AIModelExecutor initialized with models: {' → '.join(model_names)}")

    def _create_client(self, model_config: AIModelConfig) -> AsyncOpenAI:
        """创建 OpenAI 客户端"""
        return AsyncOpenAI(
            api_key=model_config.api_key,
            base_url=model_config.base_url if model_config.base_url else None,
            timeout=API_TIMEOUT,
        )

    def _should_switch(self, error: Exception) -> bool:
        """
        判断错误是否属于预期的可恢复类型（用于日志记录）

        注意：此方法仅用于日志分类，不影响实际的模型切换逻辑。
        无论错误类型如何，系统都会尝试所有备用模型。

        可恢复的错误类型：
        - 400: 无效请求（如 max_tokens 超限等模型差异）
        - 401: API Key 无效
        - 404: 模型不存在
        - 429: 速率限制
        - 503: 服务不可用
        - timeout: 请求超时

        Returns:
            错误是否属于已知的可恢复类型
        """
        error_msg = str(error).lower()
        switch_indicators = [
            '400', 'invalid_request',
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
                logger.info(f"[{task_name}] Using model: {model_config.name} ({model_config.model}) via {model_config.provider_name}")
                result = await task_func(client, model_config.model)

                # Success - return immediately
                if i > 0:
                    logger.info(f"[{task_name}] Backup model '{model_config.name}' succeeded")
                return result
            except Exception as e:
                error_msg = f"{model_config.name}: {str(e)}"
                errors.append(error_msg)
                logger.warning(f"[{task_name}] Model '{model_config.name}' failed: {e}")

                # Check if there are more models to try
                if i < len(self.models) - 1:
                    next_model = self.models[i + 1]

                    # Log whether this is an expected switchable error
                    is_switchable = self._should_switch(e)
                    switch_reason = "recoverable error" if is_switchable else "unhandled error"

                    logger.info(
                        f"[{task_name}] Switching from '{model_config.name}' ({model_config.provider_name}) "
                        f"to backup '{next_model.name}' ({next_model.provider_name}) ({switch_reason})"
                    )
                    continue  # Try next model
                else:
                    # Last model - log and break to raise final error
                    logger.error(f"[{task_name}] All {len(self.models)} model(s) failed")
                    break

        # All models exhausted
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
