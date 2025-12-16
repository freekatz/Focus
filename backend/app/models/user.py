"""
用户模型 - 简化版（单用户）
"""
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """用户表 - 单用户模式，仅存储认证信息"""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # 关系
    config: Mapped[Optional["UserConfig"]] = relationship(
        "UserConfig", back_populates="user", uselist=False, lazy="selectin"
    )
    subscriptions: Mapped[List["UserRssSubscription"]] = relationship(
        "UserRssSubscription", back_populates="user", cascade="all, delete-orphan"
    )
