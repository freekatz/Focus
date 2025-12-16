"""
用户相关 Schema
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """登录请求"""
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    """登录响应"""
    access_token: str
    token_type: str = "bearer"
    username: str


class PasswordUpdateRequest(BaseModel):
    """修改密码请求"""
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=100)


class UserResponse(BaseModel):
    """用户信息响应"""
    id: int
    username: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserConfigResponse(BaseModel):
    """用户配置响应"""
    id: int
    rss_fetch_interval: int
    unmarked_retention_days: int
    trash_retention_days: int
    archive_after_days: int
    ai_provider: str
    ai_model: str
    ai_base_url: Optional[str]
    ai_api_key_configured: bool = False  # 标识 AI API Key 是否已配置
    sage_prompt: Optional[str]
    zotero_library_id: Optional[str]
    zotero_library_type: str
    zotero_collection: Optional[str]
    zotero_api_key_configured: bool = False  # 标识 Zotero API Key 是否已配置
    theme: str
    entries_per_page: int

    model_config = {"from_attributes": True}


class UserConfigUpdateRequest(BaseModel):
    """用户配置更新请求"""
    rss_fetch_interval: Optional[int] = Field(None, ge=5, le=1440)
    unmarked_retention_days: Optional[int] = Field(None, ge=1, le=365)
    trash_retention_days: Optional[int] = Field(None, ge=1, le=90)
    archive_after_days: Optional[int] = Field(None, ge=30, le=365)
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    ai_api_key: Optional[str] = None
    ai_base_url: Optional[str] = None
    sage_prompt: Optional[str] = None
    zotero_library_id: Optional[str] = None
    zotero_library_type: Optional[str] = None
    zotero_api_key: Optional[str] = None
    zotero_collection: Optional[str] = None
    theme: Optional[str] = None
    entries_per_page: Optional[int] = Field(None, ge=10, le=100)
