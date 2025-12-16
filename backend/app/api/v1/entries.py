"""
文章条目 API
"""
from datetime import datetime
from typing import Optional, Literal

from fastapi import APIRouter, HTTPException, status, Query

from app.api.deps import DbSession, CurrentUser
from app.models.entry import EntryStatus
from app.schemas.entry import (
    EntryResponse,
    EntryListResponse,
    EntryStatusUpdateRequest,
    EntryBatchStatusRequest,
    EntryBatchResponse,
    EntryNotesUpdateRequest,
    EntryStatsResponse,
)
from app.services import entry_service

router = APIRouter()


def entry_to_response(entry) -> EntryResponse:
    """将 Entry 模型转换为响应"""
    # 优先使用条目自身保存的源名称（即使源已删除也能显示）
    # 如果没有，则从关联的源获取
    source_name = entry.rss_source_name
    if not source_name and entry.rss_source:
        source_name = entry.rss_source.name

    return EntryResponse(
        id=entry.id,
        rss_source_id=entry.rss_source_id,
        title=entry.title,
        link=entry.link,
        author=entry.author,
        published_at=entry.published_at,
        content=entry.content,
        content_type=entry.content_type,
        status=entry.status,
        is_read=entry.is_read,
        marked_at=entry.marked_at,
        ai_summary=entry.ai_summary,
        ai_content_type=entry.ai_content_type,
        ai_processed_at=entry.ai_processed_at,
        user_notes=entry.user_notes,
        exported_to_zotero=entry.exported_to_zotero,
        fetched_at=entry.fetched_at,
        created_at=entry.created_at,
        rss_source_name=source_name,
    )


@router.get("", response_model=EntryListResponse)
async def list_entries(
    db: DbSession,
    current_user: CurrentUser,
    status: Optional[EntryStatus] = None,
    rss_source_id: Optional[int] = None,
    category: Optional[str] = None,
    period: Optional[Literal["today", "past"]] = None,
    is_read: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """获取条目列表"""
    skip = (page - 1) * page_size
    items, total = await entry_service.get_entries(
        db,
        status=status,
        rss_source_id=rss_source_id,
        category=category,
        period=period,
        is_read=is_read,
        skip=skip,
        limit=page_size,
    )

    return EntryListResponse(
        items=[entry_to_response(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(skip + len(items)) < total,
    )


@router.post("/unread/shuffle")
async def shuffle_unread_entries(db: DbSession, current_user: CurrentUser):
    """随机打乱未读条目的显示顺序"""
    count = await entry_service.shuffle_unread_entries(db)
    return {"shuffled_count": count}


@router.get("/unread", response_model=EntryListResponse)
async def list_unread_entries(
    db: DbSession,
    current_user: CurrentUser,
    period: Optional[Literal["today", "past"]] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """获取未读条目列表"""
    skip = (page - 1) * page_size
    items, total = await entry_service.get_entries(
        db,
        status=EntryStatus.UNREAD,
        period=period,
        skip=skip,
        limit=page_size,
    )

    return EntryListResponse(
        items=[entry_to_response(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(skip + len(items)) < total,
    )


@router.get("/stats", response_model=EntryStatsResponse)
async def get_entry_stats(db: DbSession, current_user: CurrentUser):
    """获取条目统计"""
    stats = await entry_service.get_entry_stats(db)
    return stats


@router.get("/search", response_model=EntryListResponse)
async def search_entries(
    db: DbSession,
    current_user: CurrentUser,
    q: str = Query(..., min_length=1),
    status: Optional[EntryStatus] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """搜索条目"""
    skip = (page - 1) * page_size
    items, total = await entry_service.search_entries(
        db,
        query_text=q,
        status=status,
        from_date=from_date,
        to_date=to_date,
        skip=skip,
        limit=page_size,
    )

    return EntryListResponse(
        items=[entry_to_response(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(skip + len(items)) < total,
    )


@router.get("/{entry_id}", response_model=EntryResponse)
async def get_entry(entry_id: int, db: DbSession, current_user: CurrentUser):
    """获取单个条目"""
    entry = await entry_service.get_entry_by_id(db, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return entry_to_response(entry)


@router.patch("/{entry_id}/status", response_model=EntryResponse)
async def update_entry_status(
    entry_id: int,
    data: EntryStatusUpdateRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """更新条目状态"""
    entry = await entry_service.get_entry_by_id(db, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    updated = await entry_service.update_entry_status(db, entry, data.status)
    return entry_to_response(updated)


@router.post("/batch/status", response_model=EntryBatchResponse)
async def batch_update_status(
    data: EntryBatchStatusRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """批量更新条目状态"""
    updated_count = await entry_service.batch_update_status(db, data.ids, data.status)
    return EntryBatchResponse(updated_count=updated_count)


@router.patch("/{entry_id}/read", response_model=EntryResponse)
async def mark_entry_read(entry_id: int, db: DbSession, current_user: CurrentUser):
    """标记条目为已读"""
    entry = await entry_service.get_entry_by_id(db, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    updated = await entry_service.mark_entry_read(db, entry)
    return entry_to_response(updated)


@router.post("/batch/read", response_model=EntryBatchResponse)
async def batch_mark_read(
    data: EntryBatchStatusRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """批量标记已读"""
    updated_count = await entry_service.batch_mark_read(db, data.ids)
    return EntryBatchResponse(updated_count=updated_count)


@router.patch("/{entry_id}/notes", response_model=EntryResponse)
async def update_entry_notes(
    entry_id: int,
    data: EntryNotesUpdateRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """更新条目笔记"""
    entry = await entry_service.get_entry_by_id(db, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    updated = await entry_service.update_entry_notes(db, entry, data.notes)
    return entry_to_response(updated)
