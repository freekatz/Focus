"""
分享相关 Schema
"""
from datetime import datetime
from typing import Optional, List, Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.entry import EntryResponse


class ShareCreateRequest(BaseModel):
    """创建文章分享请求"""
    entry_ids: List[int] = Field(..., min_length=1)
    description: Optional[str] = Field(None, max_length=500)
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)


class TextShareCreateRequest(BaseModel):
    """创建文本分享请求"""
    title: Optional[str] = Field(None, max_length=200)
    text_content: str = Field(..., min_length=1, max_length=10000)
    description: Optional[str] = Field(None, max_length=500)
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)


class ShareResponse(BaseModel):
    """分享响应"""
    id: int
    share_code: str
    share_url: str
    share_type: str
    title: Optional[str]
    description: Optional[str]
    entry_count: Optional[int]
    created_at: datetime
    expires_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ShareDetailResponse(BaseModel):
    """分享详情响应（公开访问）"""
    share_code: str
    share_type: str
    title: Optional[str]
    description: Optional[str]
    # 文章分享
    entries: Optional[List[EntryResponse]] = None
    # 文本分享
    text_content: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime]
