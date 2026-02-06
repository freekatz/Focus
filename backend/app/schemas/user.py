"""
用户相关 Schema
"""
from datetime import datetime
from typing import Optional, List

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


class AIModelConfigSchema(BaseModel):
    """单个 AI 模型配置"""
    id: str = ""  # 唯一标识（用于编辑/删除）
    name: str  # 显示名称
    provider: str  # "openai" | "openai_compatible"
    model: str  # 模型名称
    api_key: Optional[str] = None  # 仅提交时使用
    api_key_configured: bool = False  # 响应中标识是否已配置
    base_url: Optional[str] = None


class TaskAIConfigSchema(BaseModel):
    """任务 AI 配置（主模型 + 备用模型列表）"""
    primary: AIModelConfigSchema
    fallbacks: List[AIModelConfigSchema] = []


class AIModelConfigUpdateSchema(BaseModel):
    """AI 模型更新请求"""
    id: str = ""
    name: str
    provider: str
    model: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class TaskAIConfigUpdateSchema(BaseModel):
    """任务 AI 配置更新请求"""
    primary: AIModelConfigUpdateSchema
    fallbacks: List[AIModelConfigUpdateSchema] = []


class UserConfigResponse(BaseModel):
    """用户配置响应"""
    id: int
    unmarked_retention_days: int
    trash_retention_days: int
    archive_after_days: int
    # Legacy AI fields (kept for backward compatibility)
    ai_provider: str
    ai_model: str
    ai_base_url: Optional[str]
    ai_api_key_configured: bool = False  # 标识 AI API Key 是否已配置
    sage_prompt: Optional[str]
    # New multi-model AI config
    ai_config_translation: Optional[TaskAIConfigSchema] = None  # 翻译/总结模型配置
    ai_config_interpret: Optional[TaskAIConfigSchema] = None  # 解读模型配置
    auto_translate_abstract: bool = True  # 是否自动翻译 ArXiv 摘要
    auto_interpret_arxiv: bool = True  # 是否自动解读 ArXiv 论文
    zotero_library_id: Optional[str]
    zotero_library_type: str
    zotero_collection: Optional[str]
    zotero_api_key_configured: bool = False  # 标识 Zotero API Key 是否已配置
    theme: str
    color_theme: str
    font_theme: str
    custom_theme_json: Optional[str] = None
    entries_per_page: int

    model_config = {"from_attributes": True}


class UserConfigUpdateRequest(BaseModel):
    """用户配置更新请求"""
    unmarked_retention_days: Optional[int] = Field(None, ge=1, le=365)
    trash_retention_days: Optional[int] = Field(None, ge=1, le=90)
    archive_after_days: Optional[int] = Field(None, ge=30, le=365)
    # Legacy AI fields (kept for backward compatibility)
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    ai_api_key: Optional[str] = None
    ai_base_url: Optional[str] = None
    sage_prompt: Optional[str] = None
    # New multi-model AI config
    ai_config_translation: Optional[TaskAIConfigUpdateSchema] = None
    ai_config_interpret: Optional[TaskAIConfigUpdateSchema] = None
    auto_translate_abstract: Optional[bool] = None  # 是否自动翻译 ArXiv 摘要
    auto_interpret_arxiv: Optional[bool] = None  # 是否自动解读 ArXiv 论文
    zotero_library_id: Optional[str] = None
    zotero_library_type: Optional[str] = None
    zotero_api_key: Optional[str] = None
    zotero_collection: Optional[str] = None
    theme: Optional[str] = None
    color_theme: Optional[str] = None
    font_theme: Optional[str] = None
    custom_theme_json: Optional[str] = None
    entries_per_page: Optional[int] = Field(None, ge=10, le=100)
