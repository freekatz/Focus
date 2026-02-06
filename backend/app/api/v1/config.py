"""
配置管理 API
"""
import json
import uuid
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DbSession, CurrentUser
from app.models.user_config import UserConfig
from app.schemas.user import (
    UserConfigResponse,
    UserConfigUpdateRequest,
    AIProviderSchema,
    AIModelEntrySchema,
    AIModelsConfigSchema,
    AITaskConfigSchema,
)

router = APIRouter()


def parse_ai_models_config(config_json: Optional[str], user_config=None) -> Optional[AIModelsConfigSchema]:
    """将统一 AI 模型 JSON 解析为 Schema（不返回 API Key）

    支持两种存储格式:
    1. 新格式 (provider-grouped): {providers: {pid: {name, provider, api_key, base_url, models: {mid: {name, model}}}}, tasks: {...}}
    2. 旧格式 (flat models): {models: {id: {...}}, tasks: {...}}
    """
    if not config_json:
        return None

    try:
        data = json.loads(config_json)
    except json.JSONDecodeError:
        return None

    # --- Parse providers ---
    providers_data = data.get("providers", {})
    tasks_data = data.get("tasks", {})

    if providers_data:
        # New provider-grouped format
        providers = []
        for pid, pdata in providers_data.items():
            models = []
            for mid, mdata in pdata.get("models", {}).items():
                models.append(AIModelEntrySchema(
                    id=mid,
                    name=mdata.get("name", ""),
                    model=mdata.get("model", ""),
                ))
            providers.append(AIProviderSchema(
                id=pid,
                name=pdata.get("name", ""),
                provider=pdata.get("provider", "openai_compatible"),
                api_key_configured=bool(pdata.get("api_key")),
                base_url=pdata.get("base_url"),
                models=models,
            ))
    else:
        # Legacy flat format — convert models to single-model providers
        models_dict = data.get("models", {})
        providers = []
        for model_id, model_data in models_dict.items():
            # Each old model becomes a provider with one model
            providers.append(AIProviderSchema(
                id=model_id,
                name=model_data.get("name", ""),
                provider=model_data.get("provider", "openai_compatible"),
                api_key_configured=bool(model_data.get("api_key")),
                base_url=model_data.get("base_url"),
                models=[AIModelEntrySchema(
                    id="default",
                    name=model_data.get("name", ""),
                    model=model_data.get("model", ""),
                )],
            ))

    # --- Parse tasks ---
    tasks = {}
    for task_name, task_data in tasks_data.items():
        if isinstance(task_data, dict):
            raw_ids = task_data.get("model_ids", [])
            enabled = task_data.get("enabled", True)
        elif isinstance(task_data, list):
            # Legacy flat list — convert old IDs to compound "pid:default"
            raw_ids = task_data
            enabled = True
            if user_config:
                if task_name == "translation":
                    enabled = getattr(user_config, 'auto_translate_abstract', True)
                elif task_name == "interpret":
                    enabled = getattr(user_config, 'auto_interpret_arxiv', True)
        else:
            raw_ids = []
            enabled = True

        # Normalize IDs: old flat IDs (no ":") become "pid:default"
        model_ids = []
        for mid in raw_ids:
            if ":" not in mid and not providers_data:
                model_ids.append(f"{mid}:default")
            else:
                model_ids.append(mid)

        tasks[task_name] = AITaskConfigSchema(
            model_ids=model_ids,
            enabled=enabled,
        )

    return AIModelsConfigSchema(providers=providers, tasks=tasks)


def update_ai_models_config_json(existing_json: Optional[str], update_data) -> str:
    """更新统一 AI 模型配置 JSON，保留未更改的 API Key"""
    existing = {}
    if existing_json:
        try:
            existing = json.loads(existing_json)
        except json.JSONDecodeError:
            pass

    existing_providers = existing.get("providers", {})

    # 构建新的 providers
    new_providers = {}
    all_compound_ids = set()

    for provider_update in update_data.providers:
        pid = provider_update.id or str(uuid.uuid4())[:8]
        existing_provider = existing_providers.get(pid, {})

        models = {}
        for model_update in provider_update.models:
            mid = model_update.id or str(uuid.uuid4())[:6]
            models[mid] = {
                "name": model_update.name,
                "model": model_update.model,
            }
            all_compound_ids.add(f"{pid}:{mid}")

        new_providers[pid] = {
            "name": provider_update.name,
            "provider": provider_update.provider,
            "api_key": provider_update.api_key if provider_update.api_key else existing_provider.get("api_key", ""),
            "base_url": provider_update.base_url,
            "models": models,
        }

    # 构建任务配置（只保留有效的复合 ID）
    tasks = {}
    for task_name, task_config in update_data.tasks.items():
        tasks[task_name] = {
            "model_ids": [mid for mid in task_config.model_ids if mid in all_compound_ids],
            "enabled": task_config.enabled,
        }

    result = {
        "providers": new_providers,
        "tasks": tasks,
    }
    return json.dumps(result, ensure_ascii=False)


class AIValidateRequest(BaseModel):
    """AI API Key 验证请求"""
    api_key: str
    base_url: Optional[str] = None
    model: Optional[str] = None


class AIValidateResponse(BaseModel):
    """AI API Key 验证响应"""
    valid: bool
    error: Optional[str] = None
    model: Optional[str] = None


async def get_user_config(db: AsyncSession, user_id: int) -> UserConfig:
    """获取用户配置"""
    result = await db.execute(select(UserConfig).where(UserConfig.user_id == user_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User config not found"
        )
    return config


def build_config_response(config: UserConfig) -> UserConfigResponse:
    """构建用户配置响应"""
    ai_models_config = parse_ai_models_config(
        getattr(config, 'ai_models', None),
        user_config=config,
    )

    # Derive auto flags from tasks config (with fallback to DB columns for legacy)
    auto_translate = getattr(config, 'auto_translate_abstract', True)
    auto_interpret = getattr(config, 'auto_interpret_arxiv', True)
    if ai_models_config and ai_models_config.tasks:
        trans_task = ai_models_config.tasks.get("translation")
        if trans_task is not None:
            auto_translate = trans_task.enabled
        interp_task = ai_models_config.tasks.get("interpret")
        if interp_task is not None:
            auto_interpret = interp_task.enabled

    return UserConfigResponse(
        id=config.id,
        unmarked_retention_days=config.unmarked_retention_days,
        trash_retention_days=config.trash_retention_days,
        archive_after_days=config.archive_after_days,
        ai_provider=config.ai_provider,
        ai_model=config.ai_model,
        ai_base_url=config.ai_base_url,
        ai_api_key_configured=bool(config.ai_api_key),
        sage_prompt=config.sage_prompt,
        ai_models_config=ai_models_config,
        auto_translate_abstract=auto_translate,
        auto_interpret_arxiv=auto_interpret,
        zotero_library_id=config.zotero_library_id,
        zotero_library_type=config.zotero_library_type,
        zotero_collection=config.zotero_collection,
        zotero_api_key_configured=bool(config.zotero_api_key),
        theme=config.theme,
        color_theme=getattr(config, 'color_theme', 'cream'),
        font_theme=getattr(config, 'font_theme', 'sans'),
        custom_theme_json=getattr(config, 'custom_theme_json', None),
        entries_per_page=config.entries_per_page,
    )


@router.get("", response_model=UserConfigResponse)
async def get_config(db: DbSession, current_user: CurrentUser):
    """获取用户配置"""
    config = await get_user_config(db, current_user.id)
    return build_config_response(config)


@router.put("", response_model=UserConfigResponse)
async def update_config(
    data: UserConfigUpdateRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """更新用户配置"""
    config = await get_user_config(db, current_user.id)

    update_data = data.model_dump(exclude_unset=True)

    # 特殊处理统一 AI 模型配置更新
    if 'ai_models_config' in update_data and update_data['ai_models_config']:
        config.ai_models = update_ai_models_config_json(
            config.ai_models,
            data.ai_models_config
        )
        # Sync enabled flags to legacy DB columns for backward compatibility
        for task_name, task_config in data.ai_models_config.tasks.items():
            if task_name == "translation":
                config.auto_translate_abstract = task_config.enabled
            elif task_name == "interpret":
                config.auto_interpret_arxiv = task_config.enabled
        del update_data['ai_models_config']

    # 更新其他字段
    for field, value in update_data.items():
        setattr(config, field, value)

    await db.commit()
    await db.refresh(config)

    return build_config_response(config)


@router.post("/ai/validate", response_model=AIValidateResponse)
async def validate_ai_api_key_endpoint(
    data: AIValidateRequest,
    current_user: CurrentUser,
):
    """验证 AI API Key 是否有效"""
    from app.services.arxiv_service import validate_ai_api_key

    result = await validate_ai_api_key(
        api_key=data.api_key,
        base_url=data.base_url,
        model=data.model,
    )
    return AIValidateResponse(**result)
