"""
文章条目模型
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import String, Text, Integer, Boolean, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EntryStatus(str, Enum):
    """条目状态"""
    UNREAD = "unread"           # 未读（未标记）
    INTERESTED = "interested"   # 感兴趣
    TRASH = "trash"             # 垃圾桶
    FAVORITE = "favorite"       # 收藏
    ARCHIVED = "archived"       # 已归档（感兴趣/收藏超过90天）


class Entry(Base):
    """文章条目表"""

    __tablename__ = "entries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    rss_source_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("rss_sources.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # 保存源名称快照，即使源被删除也能显示来源
    rss_source_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # 原始信息
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    link: Mapped[str] = mapped_column(String(1000), nullable=False)
    author: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 原始内容/摘要
    content_type: Mapped[str] = mapped_column(String(20), default="html")  # html, text, markdown

    # 去重
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    guid: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # RSS 原始 GUID

    # 状态
    status: Mapped[EntryStatus] = mapped_column(
        SQLEnum(EntryStatus), default=EntryStatus.UNREAD, index=True
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    marked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # AI 生成内容
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_content_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ai_processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # 用户笔记
    user_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 显示顺序（用于自定义排序，如随机打乱）
    display_order: Mapped[int] = mapped_column(Integer, default=0, index=True)

    # 导出状态
    exported_to_zotero: Mapped[bool] = mapped_column(Boolean, default=False)
    zotero_item_key: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # 时间戳
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # 关系（可选，因为源可能被删除）
    rss_source: Mapped[Optional["RssSource"]] = relationship("RssSource", back_populates="entries")

    # 索引和约束
    __table_args__ = (
        Index("ix_entry_status", "status"),
        Index("ix_entry_published", "published_at"),
        Index("ix_entry_expires", "expires_at"),
        Index("ix_entry_fetched", "fetched_at"),
        Index("ix_entry_status_published", "status", "published_at"),  # 复合索引：常用查询
        Index("ix_entry_is_read", "is_read"),
        Index("ix_entry_source_name", "rss_source_name"),  # 源名称索引，用于筛选孤立条目
        # 唯一约束：同一源下同一内容只能有一条
        # 注意：当 rss_source_id 为 NULL 时（源已删除），此约束不生效
        # SQLite 和 PostgreSQL 都将 NULL 视为不相等，所以孤立条目不受约束影响
        UniqueConstraint("rss_source_id", "content_hash", name="uq_entry_source_content"),
    )
