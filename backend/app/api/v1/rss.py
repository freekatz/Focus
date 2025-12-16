"""
RSS 管理 API
"""
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Query

from app.api.deps import DbSession, CurrentUser
from app.models.rss import RssCategory
from app.schemas.rss import (
    RssSourceCreate,
    RssSourceUpdate,
    RssSourceResponse,
    RssSourceListResponse,
    RssValidateRequest,
    RssValidateResponse,
    RssFetchResponse,
    RssStatsResponse,
)
from app.services import rss_service

router = APIRouter()


@router.get("", response_model=RssSourceListResponse)
async def list_rss_sources(
    db: DbSession,
    current_user: CurrentUser,
    category: Optional[RssCategory] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """获取 RSS 源列表"""
    items, total = await rss_service.get_rss_sources(
        db, category=category, is_active=is_active, skip=skip, limit=limit
    )
    return RssSourceListResponse(items=items, total=total)


@router.post("", response_model=RssSourceResponse, status_code=status.HTTP_201_CREATED)
async def create_rss_source(
    data: RssSourceCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    """创建 RSS 源"""
    try:
        rss_source = await rss_service.create_rss_source(db, data)
        return rss_source
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/stats", response_model=RssStatsResponse)
async def get_rss_stats(db: DbSession, current_user: CurrentUser):
    """获取 RSS 统计信息"""
    stats = await rss_service.get_rss_stats(db)
    return stats


@router.post("/validate", response_model=RssValidateResponse)
async def validate_rss_url(
    data: RssValidateRequest,
    current_user: CurrentUser,
):
    """验证 RSS URL 是否有效"""
    result = await rss_service.validate_rss_url(data.url, data.allow_ssl_bypass)
    return result


@router.get("/{rss_id}", response_model=RssSourceResponse)
async def get_rss_source(
    rss_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    """获取单个 RSS 源"""
    rss_source = await rss_service.get_rss_source_by_id(db, rss_id)
    if not rss_source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RSS source not found")
    return rss_source


@router.put("/{rss_id}", response_model=RssSourceResponse)
async def update_rss_source(
    rss_id: int,
    data: RssSourceUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    """更新 RSS 源"""
    rss_source = await rss_service.get_rss_source_by_id(db, rss_id)
    if not rss_source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RSS source not found")

    try:
        updated = await rss_service.update_rss_source(db, rss_source, data)
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{rss_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rss_source(
    rss_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    """删除 RSS 源"""
    rss_source = await rss_service.get_rss_source_by_id(db, rss_id)
    if not rss_source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RSS source not found")

    await rss_service.delete_rss_source(db, rss_source)


@router.post("/{rss_id}/fetch", response_model=RssFetchResponse)
async def fetch_rss_source(
    rss_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    """手动触发采集指定 RSS 源"""
    rss_source = await rss_service.get_rss_source_by_id(db, rss_id)
    if not rss_source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RSS source not found")

    fetched_count, new_count = await rss_service.fetch_rss_entries(db, rss_source)

    return RssFetchResponse(
        success=rss_source.last_fetch_status == "success",
        fetched_count=fetched_count,
        new_count=new_count,
        error=rss_source.last_fetch_error,
    )
