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
    """单个 AI 模型配置（响应）"""
    id: str
    name: str
    provider: str  # "openai" | "openai_compatible"
    model: str
    api_key_configured: bool = False  # 响应中不返回实际 key
    base_url: Optional[str] = None


class AITaskConfigSchema(BaseModel):
    """单个 AI 任务配置（响应）"""
    model_ids: List[str] = []   # 有序模型 ID 列表（第一个为主模型）
    enabled: bool = True        # 是否启用自动执行

class AIModelsConfigSchema(BaseModel):
    """统一 AI 模型配置（响应）"""
    models: List[AIModelConfigSchema] = []                     # 全局模型池
    tasks: dict[str, AITaskConfigSchema] = {}                  # 任务配置 {"translation": {...}, "interpret": {...}}


class AIModelConfigUpdateSchema(BaseModel):
    """单个 AI 模型更新请求"""
    id: str = ""
    name: str
    provider: str
    model: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class AITaskConfigUpdateSchema(BaseModel):
    """单个 AI 任务配置更新请求"""
    model_ids: List[str] = []
    enabled: bool = True

class AIModelsConfigUpdateSchema(BaseModel):
    """统一 AI 模型配置更新请求"""
    models: List[AIModelConfigUpdateSchema] = []       # 全局模型池
    tasks: dict[str, AITaskConfigUpdateSchema] = {}    # 任务配置


# Legacy schemas kept for backward compatibility during migration
class TaskAIConfigSchema(BaseModel):
    """任务 AI 配置（主模型 + 备用模型列表）- legacy"""
    primary: AIModelConfigSchema
    fallbacks: List[AIModelConfigSchema] = []


class TaskAIConfigUpdateSchema(BaseModel):
    """任务 AI 配置更新请求 - legacy"""
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
    ai_api_key_configured: bool = False
    sage_prompt: Optional[str]
    # Unified AI models config
    ai_models_config: Optional[AIModelsConfigSchema] = None
    # Legacy: kept in response for backward compatibility, derived from ai_models_config.tasks
    auto_translate_abstract: bool = True
    auto_interpret_arxiv: bool = True
    zotero_library_id: Optional[str]
    zotero_library_type: str
    zotero_collection: Optional[str]
    zotero_api_key_configured: bool = False
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
    # Unified AI models config
    ai_models_config: Optional[AIModelsConfigUpdateSchema] = None
    auto_translate_abstract: Optional[bool] = None
    auto_interpret_arxiv: Optional[bool] = None
    zotero_library_id: Optional[str] = None
    zotero_library_type: Optional[str] = None
    zotero_api_key: Optional[str] = None
    zotero_collection: Optional[str] = None
    theme: Optional[str] = None
    color_theme: Optional[str] = None
    font_theme: Optional[str] = None
    custom_theme_json: Optional[str] = None
    entries_per_page: Optional[int] = Field(None, ge=10, le=100)
