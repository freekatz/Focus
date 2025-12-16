"""
分享记录模型
"""
from datetime import datetime
from typing import Optional, List

from sqlalchemy import String, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Share(Base):
    """分享记录表"""

    __tablename__ = "shares"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # 分享码（唯一短码，用于生成分享链接）
    share_code: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )

    # 分享类型: entries - 文章分享, text - 纯文本分享
    share_type: Mapped[str] = mapped_column(String(20), default="entries")

    # 分享的文章 ID 列表（entries 类型使用）
    entry_ids: Mapped[Optional[List[int]]] = mapped_column(JSON, nullable=True)

    # 纯文本内容（text 类型使用）
    text_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 分享标题
    title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # 分享描述
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)  # 可选过期时间
