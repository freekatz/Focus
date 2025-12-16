"""
用户配置模型
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserConfig(Base):
    """用户配置表"""

    __tablename__ = "user_configs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), unique=True, nullable=False
    )

    # RSS 采集配置
    rss_fetch_interval: Mapped[int] = mapped_column(Integer, default=30)  # 分钟

    # 数据保留策略
    unmarked_retention_days: Mapped[int] = mapped_column(Integer, default=30)
    trash_retention_days: Mapped[int] = mapped_column(Integer, default=15)
    archive_after_days: Mapped[int] = mapped_column(Integer, default=90)  # 感兴趣/收藏超过N天后归档

    # AI 配置
    ai_provider: Mapped[str] = mapped_column(String(50), default="openai")
    ai_model: Mapped[str] = mapped_column(String(100), default="gpt-4o-mini")
    ai_api_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ai_base_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sage_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 智者提示词

    # Zotero 配置
    zotero_library_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    zotero_library_type: Mapped[str] = mapped_column(String(20), default="user")
    zotero_api_key: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    zotero_collection: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # 默认分类名

    # 界面配置
    theme: Mapped[str] = mapped_column(String(20), default="light")
    entries_per_page: Mapped[int] = mapped_column(Integer, default=20)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # 关系
    user: Mapped["User"] = relationship("User", back_populates="config")
