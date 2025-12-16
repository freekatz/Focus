"""
Focus 配置管理
"""
from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # 应用配置
    app_name: str = "Focus"
    app_version: str = "0.1.0"
    debug: bool = False

    # 服务器配置
    host: str = "0.0.0.0"
    port: int = 8000
    frontend_url: str = Field(default="http://localhost:5173", description="Frontend URL for share links")
    cors_origins: str = Field(default="*", description="Allowed CORS origins, comma-separated or * for all")
    allowed_hosts: str = Field(
        default="localhost,127.0.0.1",
        description="Allowed hosts for TrustedHost middleware, comma-separated or * for all"
    )

    # 数据库配置
    database_url: str = Field(
        default="sqlite+aiosqlite:///./focus.db",
        description="数据库连接URL"
    )

    # JWT 配置
    secret_key: str = Field(
        default="focus-secret-key-change-in-production",
        description="JWT 密钥"
    )
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 天

    # 默认用户配置（单用户模式）
    default_username: str = "admin"
    default_password: str = "focus123"

    # RSS 采集配置
    rss_fetch_interval: int = Field(default=30, description="RSS 采集间隔（分钟）")
    rss_fetch_timeout: int = Field(default=30, description="RSS 采集超时（秒）")
    max_entries_per_source: int = Field(default=100, description="每个源最大条目数")

    # 数据保留配置
    unmarked_retention_days: int = Field(default=30, description="未标记条目保留天数")
    trash_retention_days: int = Field(default=15, description="垃圾桶条目保留天数")

    # AI 配置
    ai_provider: str = Field(default="openai", description="AI 提供商")
    ai_model: str = Field(default="gpt-4o-mini", description="AI 模型")
    ai_api_key: Optional[str] = Field(default=None, description="AI API 密钥")
    ai_base_url: Optional[str] = Field(default=None, description="AI API 基础 URL")

    # Zotero 配置
    zotero_library_id: Optional[str] = Field(default=None, description="Zotero 库 ID")
    zotero_library_type: str = Field(default="user", description="Zotero 库类型")
    zotero_api_key: Optional[str] = Field(default=None, description="Zotero API 密钥")

    # 日志配置
    log_level: str = "INFO"
    log_file: Optional[str] = Field(default="logs/focus.log", description="日志文件路径")


@lru_cache
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


settings = get_settings()
