"""
配置管理 API
"""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DbSession, CurrentUser
from app.models.user_config import UserConfig
from app.schemas.user import UserConfigResponse, UserConfigUpdateRequest

router = APIRouter()


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
    # 构建响应，添加 API Key 配置状态标识
    return UserConfigResponse(
        id=config.id,
        rss_fetch_interval=config.rss_fetch_interval,
        unmarked_retention_days=config.unmarked_retention_days,
        trash_retention_days=config.trash_retention_days,
        archive_after_days=config.archive_after_days,
        ai_provider=config.ai_provider,
        ai_model=config.ai_model,
        ai_base_url=config.ai_base_url,
        ai_api_key_configured=bool(config.ai_api_key),  # 不返回实际 key，只返回是否已配置
        sage_prompt=config.sage_prompt,
        zotero_library_id=config.zotero_library_id,
        zotero_library_type=config.zotero_library_type,
        zotero_collection=config.zotero_collection,
        zotero_api_key_configured=bool(config.zotero_api_key),  # 不返回实际 key，只返回是否已配置
        theme=config.theme,
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
    for field, value in update_data.items():
        setattr(config, field, value)

    await db.commit()
    await db.refresh(config)
    # 返回响应，添加 API Key 配置状态标识
    return UserConfigResponse(
        id=config.id,
        rss_fetch_interval=config.rss_fetch_interval,
        unmarked_retention_days=config.unmarked_retention_days,
        trash_retention_days=config.trash_retention_days,
        archive_after_days=config.archive_after_days,
        ai_provider=config.ai_provider,
        ai_model=config.ai_model,
        ai_base_url=config.ai_base_url,
        ai_api_key_configured=bool(config.ai_api_key),
        sage_prompt=config.sage_prompt,
        zotero_library_id=config.zotero_library_id,
        zotero_library_type=config.zotero_library_type,
        zotero_collection=config.zotero_collection,
        zotero_api_key_configured=bool(config.zotero_api_key),
        theme=config.theme,
        entries_per_page=config.entries_per_page,
    )
