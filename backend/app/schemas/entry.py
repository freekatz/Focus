"""
文章条目相关 Schema
"""
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field

from app.models.entry import EntryStatus


class EntryBase(BaseModel):
    """条目基础字段"""
    title: str
    link: str
    author: Optional[str] = None
    published_at: Optional[datetime] = None
    content: Optional[str] = None


class EntryResponse(BaseModel):
    """条目响应"""
    id: int
    rss_source_id: Optional[int]  # 可空，源被删除后为 None
    title: str
    link: str
    author: Optional[str]
    published_at: Optional[datetime]
    content: Optional[str]
    content_type: str
    status: EntryStatus
    is_read: bool
    marked_at: Optional[datetime]
    ai_summary: Optional[str]
    ai_content_type: Optional[str]
    ai_processed_at: Optional[datetime]
    user_notes: Optional[str]
    exported_to_zotero: bool
    fetched_at: datetime
    created_at: datetime

    # 关联信息（即使源被删除，仍保留源名称）
    rss_source_name: Optional[str] = None

    model_config = {"from_attributes": True}


class EntryListResponse(BaseModel):
    """条目列表响应"""
    items: List[EntryResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class EntryStatusUpdateRequest(BaseModel):
    """更新条目状态请求"""
    status: EntryStatus


class EntryBatchStatusRequest(BaseModel):
    """批量更新条目状态请求"""
    ids: List[int] = Field(..., min_length=1)
    status: EntryStatus


class EntryBatchResponse(BaseModel):
    """批量操作响应"""
    updated_count: int


class EntryNotesUpdateRequest(BaseModel):
    """更新条目笔记请求"""
    notes: Optional[str] = None


class EntryStatsResponse(BaseModel):
    """条目统计响应"""
    total: int
    by_status: dict[str, int]
    today_count: int
    unread_count: int
