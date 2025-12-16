"""
RSS 相关 Schema
"""
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, HttpUrl

from app.models.rss import RssCategory


class RssSourceBase(BaseModel):
    """RSS 源基础字段"""
    name: str = Field(..., min_length=1, max_length=100)
    url: str = Field(..., min_length=1, max_length=500)
    category: RssCategory = RssCategory.OTHER
    description: Optional[str] = None
    website_url: Optional[str] = None
    fetch_interval: Optional[int] = Field(None, ge=5, le=1440)


class RssSourceCreate(RssSourceBase):
    """创建 RSS 源请求"""
    pass


class RssSourceUpdate(BaseModel):
    """更新 RSS 源请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    url: Optional[str] = Field(None, min_length=1, max_length=500)
    category: Optional[RssCategory] = None
    description: Optional[str] = None
    website_url: Optional[str] = None
    is_active: Optional[bool] = None
    fetch_interval: Optional[int] = Field(None, ge=5, le=1440)


class RssSourceResponse(BaseModel):
    """RSS 源响应"""
    id: int
    name: str
    url: str
    website_url: Optional[str]
    description: Optional[str]
    category: RssCategory
    icon_url: Optional[str]
    is_active: bool
    fetch_interval: Optional[int]
    last_fetched_at: Optional[datetime]
    last_fetch_status: str
    last_fetch_error: Optional[str]
    fetch_count: int
    entry_count: int
    unread_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RssSourceListResponse(BaseModel):
    """RSS 源列表响应"""
    items: List[RssSourceResponse]
    total: int


class RssValidateRequest(BaseModel):
    """验证 RSS URL 请求"""
    url: str = Field(..., min_length=1, max_length=500)


class RssValidateResponse(BaseModel):
    """验证 RSS URL 响应"""
    valid: bool
    title: Optional[str] = None
    description: Optional[str] = None
    link: Optional[str] = None
    error: Optional[str] = None


class RssFetchResponse(BaseModel):
    """手动采集响应"""
    success: bool
    fetched_count: int
    new_count: int
    error: Optional[str] = None


class RssStatsResponse(BaseModel):
    """RSS 统计响应"""
    total: int
    active: int
    by_category: dict[str, int]
    total_entries: int
    total_unread: int
