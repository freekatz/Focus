"""
RSS 源模型
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List

from sqlalchemy import String, Text, Integer, Boolean, DateTime, Index
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RssCategory(str, Enum):
    """RSS 分类"""
    BLOG = "blog"                   # 个人博客
    COMMUNITY = "community"         # 技术社区
    PAPER = "paper"                 # 论文期刊
    SOCIAL = "social"               # 社交媒体
    NEWS_PODCAST = "news_podcast"   # 新闻播客
    OTHER = "other"                 # 其他


class RssSource(Base):
    """RSS 源表"""

    __tablename__ = "rss_sources"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # 基本信息
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # RSS 别名
    url: Mapped[str] = mapped_column(String(500), nullable=False)   # RSS 链接
    website_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # 源站链接
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[RssCategory] = mapped_column(
        SQLEnum(RssCategory), default=RssCategory.OTHER
    )
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # favicon

    # 采集配置
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    fetch_interval: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 覆盖全局配置
    allow_ssl_bypass: Mapped[bool] = mapped_column(Boolean, default=True)  # 允许绕过 SSL 证书验证
    last_fetched_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_fetch_status: Mapped[str] = mapped_column(String(20), default="pending")
    last_fetch_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fetch_count: Mapped[int] = mapped_column(Integer, default=0)

    # 去重
    url_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)

    # 统计
    entry_count: Mapped[int] = mapped_column(Integer, default=0)
    unread_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # 关系
    # 注意：不使用级联删除 entries，删除逻辑在服务层处理
    # 删除源时会保留已收藏和感兴趣的条目，其他条目删除
    entries: Mapped[List["Entry"]] = relationship(
        "Entry", back_populates="rss_source", passive_deletes=True
    )
    subscriptions: Mapped[List["UserRssSubscription"]] = relationship(
        "UserRssSubscription", back_populates="rss_source", cascade="all, delete-orphan"
    )

    # 索引
    __table_args__ = (
        Index("ix_rss_category", "category"),
        Index("ix_rss_active", "is_active"),
    )
