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
    TaskAIConfigSchema,
)

router = APIRouter()


def parse_ai_config_to_schema(config_json: Optional[str]) -> Optional[TaskAIConfigSchema]:
    """将 JSON 配置解析为 Schema（不返回 API Key）"""
    if not config_json:
        return None

    try:
        config = json.loads(config_json)
        primary_data = config.get("primary")
        if not primary_data:
            return None

        primary = AIModelConfigSchema(
            id=primary_data.get("id", ""),
            name=primary_data.get("name", ""),
            provider=primary_data.get("provider", "openai"),
            model=primary_data.get("model", ""),
            api_key_configured=bool(primary_data.get("api_key")),
            base_url=primary_data.get("base_url"),
        )

        fallbacks = []
        for fb_data in config.get("fallbacks", []):
            fallbacks.append(AIModelConfigSchema(
                id=fb_data.get("id", ""),
                name=fb_data.get("name", ""),
                provider=fb_data.get("provider", "openai"),
                model=fb_data.get("model", ""),
                api_key_configured=bool(fb_data.get("api_key")),
                base_url=fb_data.get("base_url"),
            ))

        return TaskAIConfigSchema(primary=primary, fallbacks=fallbacks)
    except json.JSONDecodeError:
        return None


def update_ai_config_json(existing_json: Optional[str], update_data) -> str:
    """更新 AI 配置 JSON，保留未更改的 API Key"""
    existing = {}
    if existing_json:
        try:
            existing = json.loads(existing_json)
        except json.JSONDecodeError:
            pass

    existing_primary = existing.get("primary", {})
    existing_fallbacks = {fb.get("id"): fb for fb in existing.get("fallbacks", [])}

    # 更新主模型
    primary_update = update_data.primary
    new_primary = {
        "id": primary_update.id or existing_primary.get("id") or str(uuid.uuid4())[:8],
        "name": primary_update.name,
        "provider": primary_update.provider,
        "model": primary_update.model,
        "api_key": primary_update.api_key if primary_update.api_key else existing_primary.get("api_key", ""),
        "base_url": primary_update.base_url,
    }

    # 更新备用模型
    new_fallbacks = []
    for fb_update in update_data.fallbacks:
        existing_fb = existing_fallbacks.get(fb_update.id, {})
        new_fallbacks.append({
            "id": fb_update.id or str(uuid.uuid4())[:8],
            "name": fb_update.name,
            "provider": fb_update.provider,
            "model": fb_update.model,
            "api_key": fb_update.api_key if fb_update.api_key else existing_fb.get("api_key", ""),
            "base_url": fb_update.base_url,
        })

    return json.dumps({"primary": new_primary, "fallbacks": new_fallbacks}, ensure_ascii=False)


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


@router.get("", response_model=UserConfigResponse)
async def get_config(db: DbSession, current_user: CurrentUser):
    """获取用户配置"""
    config = await get_user_config(db, current_user.id)

    # 解析新的 AI 配置
    ai_config_translation = parse_ai_config_to_schema(
        getattr(config, 'ai_models_translation', None)
    )
    ai_config_interpret = parse_ai_config_to_schema(
        getattr(config, 'ai_models_interpret', None)
    )

    # 构建响应，添加 API Key 配置状态标识
    return UserConfigResponse(
        id=config.id,
        unmarked_retention_days=config.unmarked_retention_days,
        trash_retention_days=config.trash_retention_days,
        archive_after_days=config.archive_after_days,
        ai_provider=config.ai_provider,
        ai_model=config.ai_model,
        ai_base_url=config.ai_base_url,
        ai_api_key_configured=bool(config.ai_api_key),  # 不返回实际 key，只返回是否已配置
        sage_prompt=config.sage_prompt,
        ai_config_translation=ai_config_translation,
        ai_config_interpret=ai_config_interpret,
        auto_translate_abstract=getattr(config, 'auto_translate_abstract', True),
        auto_interpret_arxiv=getattr(config, 'auto_interpret_arxiv', True),
        zotero_library_id=config.zotero_library_id,
        zotero_library_type=config.zotero_library_type,
        zotero_collection=config.zotero_collection,
        zotero_api_key_configured=bool(config.zotero_api_key),  # 不返回实际 key，只返回是否已配置
        theme=config.theme,
        color_theme=getattr(config, 'color_theme', 'cream'),
        font_theme=getattr(config, 'font_theme', 'sans'),
        custom_theme_json=getattr(config, 'custom_theme_json', None),
        entries_per_page=config.entries_per_page,
    )


@router.put("", response_model=UserConfigResponse)
async def update_config(
    data: UserConfigUpdateRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """更新用户配置"""
    config = await get_user_config(db, current_user.id)

    update_data = data.model_dump(exclude_unset=True)

    # 特殊处理 AI 配置更新
    if 'ai_config_translation' in update_data and update_data['ai_config_translation']:
        config.ai_models_translation = update_ai_config_json(
            config.ai_models_translation,
            data.ai_config_translation
        )
        del update_data['ai_config_translation']

    if 'ai_config_interpret' in update_data and update_data['ai_config_interpret']:
        config.ai_models_interpret = update_ai_config_json(
            config.ai_models_interpret,
            data.ai_config_interpret
        )
        del update_data['ai_config_interpret']

    # 更新其他字段
    for field, value in update_data.items():
        setattr(config, field, value)

    await db.commit()
    await db.refresh(config)

    # 解析新的 AI 配置
    ai_config_translation = parse_ai_config_to_schema(
        getattr(config, 'ai_models_translation', None)
    )
    ai_config_interpret = parse_ai_config_to_schema(
        getattr(config, 'ai_models_interpret', None)
    )

    # 返回响应，添加 API Key 配置状态标识
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
        ai_config_translation=ai_config_translation,
        ai_config_interpret=ai_config_interpret,
        auto_translate_abstract=getattr(config, 'auto_translate_abstract', True),
        auto_interpret_arxiv=getattr(config, 'auto_interpret_arxiv', True),
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
