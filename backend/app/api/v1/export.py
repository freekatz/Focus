"""
导出 API
"""
from datetime import datetime, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, status, Query, Response
from sqlalchemy import select

from app.api.deps import DbSession, CurrentUser
from app.models.entry import EntryStatus
from app.models.user_config import UserConfig
from app.services import entry_service
from app.integrations.zotero import ZoteroClient

router = APIRouter()


def get_zotero_client(config: UserConfig) -> ZoteroClient:
    """从用户配置创建 Zotero 客户端"""
    if not config.zotero_api_key or not config.zotero_library_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zotero not configured. Please set zotero_library_id and zotero_api_key in settings.",
        )
    return ZoteroClient(
        library_id=config.zotero_library_id,
        library_type=config.zotero_library_type or "user",
        api_key=config.zotero_api_key,
    )


@router.post("/zotero/test")
async def test_zotero_connection(
    db: DbSession,
    current_user: CurrentUser,
):
    """测试 Zotero 连接"""
    result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User config not found")

    client = get_zotero_client(config)
    return client.test_connection()


@router.get("/zotero/config")
async def get_zotero_config(
    db: DbSession,
    current_user: CurrentUser,
):
    """获取 Zotero 默认配置（用于前端弹框默认值）"""
    result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User config not found")

    return {
        "default_collection": config.zotero_collection or "",
        "configured": bool(config.zotero_api_key and config.zotero_library_id)
    }


from pydantic import BaseModel

class BatchZoteroExportRequest(BaseModel):
    entry_ids: list[int]
    collection: Optional[str] = None


@router.post("/zotero/batch")
async def batch_export_to_zotero(
    data: BatchZoteroExportRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """批量导出到 Zotero"""
    # 获取用户配置
    result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User config not found")

    client = get_zotero_client(config)

    # 获取所有条目
    entries = []
    for entry_id in data.entry_ids:
        entry = await entry_service.get_entry_by_id(db, entry_id)
        if entry:
            entries.append(entry)

    if not entries:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No valid entries found")

    # 使用传入的 collection，如果没传则使用配置的默认值
    final_collection = data.collection if data.collection is not None else config.zotero_collection
    results = client.batch_create_items(entries, final_collection)
    return results


@router.post("/zotero/{entry_id}")
async def export_to_zotero(
    entry_id: int,
    db: DbSession,
    current_user: CurrentUser,
    collection: Optional[str] = Query(None, description="Zotero 分类名称"),
):
    """导出到 Zotero"""
    entry = await entry_service.get_entry_by_id(db, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    # 获取用户配置
    result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User config not found")

    client = get_zotero_client(config)
    # 使用传入的 collection，如果没传则使用配置的默认值
    final_collection = collection if collection is not None else config.zotero_collection
    item_key = client.create_web_item(entry, final_collection)

    if item_key:
        return {"success": True, "item_key": item_key, "message": "Exported to Zotero successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export to Zotero",
        )


@router.get("/rss")
async def get_personal_rss_feed(
    db: DbSession,
    type: Literal["all", "interested", "favorite"] = Query("all", description="列表类型"),
    days: int = Query(7, ge=1, le=365, description="时间范围（天）"),
):
    """
    获取个人 RSS Feed

    - type: all (全部), interested (感兴趣), favorite (收藏)
    - days: 时间范围
    - 返回: RSS XML 格式
    """
    from feedgenerator import Rss201rev2Feed

    # 根据类型确定状态筛选
    status_filter = None
    if type == "interested":
        status_filter = EntryStatus.INTERESTED
    elif type == "favorite":
        status_filter = EntryStatus.FAVORITE

    # 获取条目
    entries, _ = await entry_service.get_entries(
        db,
        status=status_filter,
        skip=0,
        limit=100,  # RSS Feed 最多返回 100 条
    )

    # 过滤时间范围（基于采集时间）
    cutoff = datetime.utcnow() - timedelta(days=days)
    entries = [e for e in entries if e.fetched_at >= cutoff]

    # 生成 RSS Feed
    feed = Rss201rev2Feed(
        title=f"Focus - {type.capitalize()}",
        link="http://localhost:8000",
        description=f"Focus personal RSS feed - {type}",
        language="zh-cn",
    )

    for entry in entries:
        feed.add_item(
            title=entry.title,
            link=entry.link,
            description=entry.ai_summary or entry.content or "",
            author_name=entry.author,
            pubdate=entry.published_at or entry.fetched_at,
            unique_id=str(entry.id),
        )

    # 返回 RSS XML
    rss_content = feed.writeString("utf-8")
    return Response(
        content=rss_content,
        media_type="application/rss+xml; charset=utf-8",
    )
