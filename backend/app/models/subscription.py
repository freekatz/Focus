"""
用户 RSS 订阅模型
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRssSubscription(Base):
    """
    用户 RSS 订阅表

    关联用户和 RSS 源，存储用户的个性化配置
    """

    __tablename__ = "user_rss_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    rss_source_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rss_sources.id"), nullable=False
    )

    # 用户个性化配置（覆盖全局配置）
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)  # 是否启用
    custom_fetch_interval: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 自定义采集间隔

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # 关系
    user: Mapped["User"] = relationship("User", back_populates="subscriptions")
    rss_source: Mapped["RssSource"] = relationship("RssSource", back_populates="subscriptions")

    # 唯一约束：每个用户对每个源只能有一个订阅
    __table_args__ = (
        UniqueConstraint("user_id", "rss_source_id", name="uq_user_rss_subscription"),
    )
