"""
订阅相关 Schema
"""
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field

from app.models.rss import RssCategory


class SubscriptionCreate(BaseModel):
    """创建订阅请求"""
    rss_source_id: int
    is_active: bool = True
    custom_fetch_interval: Optional[int] = Field(None, ge=5, le=1440)


class SubscriptionUpdate(BaseModel):
    """更新订阅请求"""
    is_active: Optional[bool] = None
    custom_fetch_interval: Optional[int] = Field(None, ge=5, le=1440)


class SubscriptionResponse(BaseModel):
    """订阅响应"""
    id: int
    rss_source_id: int
    is_active: bool
    custom_fetch_interval: Optional[int]
    created_at: datetime

    # 关联的 RSS 源信息
    rss_source_name: str
    rss_source_url: str
    rss_source_category: RssCategory
    rss_source_description: Optional[str]
    entry_count: int
    unread_count: int
    last_fetched_at: Optional[datetime]
    last_fetch_status: str

    model_config = {"from_attributes": True}


class SubscriptionListResponse(BaseModel):
    """订阅列表响应"""
    items: List[SubscriptionResponse]
    total: int


class BatchSubscribeRequest(BaseModel):
    """批量订阅请求"""
    rss_source_ids: List[int]


class BatchSubscribeResponse(BaseModel):
    """批量订阅响应"""
    success: List[int]  # 成功订阅的 rss_source_id
    already_subscribed: List[int]  # 已经订阅的
    not_found: List[int]  # 不存在的


class RssMarketItemResponse(BaseModel):
    """RSS 市场条目响应"""
    id: int
    name: str
    url: str
    website_url: Optional[str]
    description: Optional[str]
    category: RssCategory
    icon_url: Optional[str]
    entry_count: int
    # 用户是否已订阅
    is_subscribed: bool

    model_config = {"from_attributes": True}


class RssMarketListResponse(BaseModel):
    """RSS 市场列表响应"""
    items: List[RssMarketItemResponse]
    total: int


class RssBatchImportItem(BaseModel):
    """批量导入条目"""
    name: str = Field(..., min_length=1, max_length=100)
    url: str = Field(..., min_length=1, max_length=500)
    category: RssCategory = RssCategory.OTHER
    description: Optional[str] = None


class RssBatchImportRequest(BaseModel):
    """批量导入请求"""
    items: List[RssBatchImportItem]


class RssBatchImportResponse(BaseModel):
    """批量导入响应"""
    success: int
    failed: int
    errors: List[str]
