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
    AIModelConfigSchema,
    AIModelsConfigSchema,
    AITaskConfigSchema,
)

router = APIRouter()


def parse_ai_models_config(config_json: Optional[str], user_config=None) -> Optional[AIModelsConfigSchema]:
    """将统一 AI 模型 JSON 解析为 Schema（不返回 API Key）"""
    if not config_json:
        return None

    try:
        data = json.loads(config_json)
        models_dict = data.get("models", {})
        tasks_data = data.get("tasks", {})

        models = []
        for model_id, model_data in models_dict.items():
            models.append(AIModelConfigSchema(
                id=model_id,
                name=model_data.get("name", ""),
                provider=model_data.get("provider", "openai"),
                model=model_data.get("model", ""),
                api_key_configured=bool(model_data.get("api_key")),
                base_url=model_data.get("base_url"),
            ))

        # Parse tasks with enabled flags
        tasks = {}
        for task_name, task_data in tasks_data.items():
            if isinstance(task_data, dict):
                # New format: {model_ids: [...], enabled: bool}
                tasks[task_name] = AITaskConfigSchema(
                    model_ids=task_data.get("model_ids", []),
                    enabled=task_data.get("enabled", True),
                )
            elif isinstance(task_data, list):
                # Legacy format: [id1, id2, ...] — migrate to new format
                # Use DB column values for enabled flags during migration
                enabled = True
                if user_config:
                    if task_name == "translation":
                        enabled = getattr(user_config, 'auto_translate_abstract', True)
                    elif task_name == "interpret":
                        enabled = getattr(user_config, 'auto_interpret_arxiv', True)
                tasks[task_name] = AITaskConfigSchema(
                    model_ids=task_data,
                    enabled=enabled,
                )

        return AIModelsConfigSchema(
            models=models,
            tasks=tasks,
        )
    except json.JSONDecodeError:
        return None


def update_ai_models_config_json(existing_json: Optional[str], update_data) -> str:
    """更新统一 AI 模型配置 JSON，保留未更改的 API Key"""
    existing = {}
    if existing_json:
        try:
            existing = json.loads(existing_json)
        except json.JSONDecodeError:
            pass

    existing_models = existing.get("models", {})

    # 构建新的模型池
    new_models = {}
    for model_update in update_data.models:
        model_id = model_update.id or str(uuid.uuid4())[:8]
        existing_model = existing_models.get(model_id, {})

        new_models[model_id] = {
            "name": model_update.name,
            "provider": model_update.provider,
            "model": model_update.model,
            "api_key": model_update.api_key if model_update.api_key else existing_model.get("api_key", ""),
            "base_url": model_update.base_url,
        }

    # 构建任务配置（只保留模型池中存在的 ID）
    valid_ids = set(new_models.keys())
    tasks = {}
    for task_name, task_config in update_data.tasks.items():
        tasks[task_name] = {
            "model_ids": [mid for mid in task_config.model_ids if mid in valid_ids],
            "enabled": task_config.enabled,
        }

    result = {
        "models": new_models,
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
    """验证 AI API Key 是否有效

    发送一个简单的测试请求来验证 API Key 的有效性。
    可用于在保存配置前先验证 API Key。
    """
    from app.services.arxiv_service import validate_ai_api_key

    result = await validate_ai_api_key(
        api_key=data.api_key,
        base_url=data.base_url,
        model=data.model,
    )
    return AIValidateResponse(**result)
