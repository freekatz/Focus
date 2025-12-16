"""
分享 API
"""
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, HTTPException, status, Request
from sqlalchemy import select

from app.api.deps import DbSession, CurrentUser
from app.models.share import Share
from app.schemas.share import ShareCreateRequest, ShareResponse, ShareDetailResponse
from app.schemas.entry import EntryResponse
from app.services import entry_service
from app.utils.hash import generate_short_code
from app.database import get_db, async_session_maker
from app.config import settings

router = APIRouter()


@router.post("", response_model=ShareResponse, status_code=status.HTTP_201_CREATED)
async def create_share(
    data: ShareCreateRequest,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
):
    """创建文章分享"""
    # 验证条目是否存在
    entries = await entry_service.get_entries_by_ids(db, data.entry_ids)
    if len(entries) != len(data.entry_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some entries not found",
        )

    # 生成唯一分享码
    share_code = generate_short_code(8)

    # 计算过期时间
    expires_at = None
    if data.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=data.expires_in_days)

    # 创建分享记录
    share = Share(
        share_code=share_code,
        share_type="entries",
        entry_ids=data.entry_ids,
        description=data.description,
        expires_at=expires_at,
    )
    db.add(share)
    await db.commit()
    await db.refresh(share)

    # 构建分享 URL（根据请求的 Origin 或 Referer 动态生成）
    origin = request.headers.get("origin") or request.headers.get("referer")
    if origin:
        # 从 origin/referer 提取基础 URL
        from urllib.parse import urlparse
        parsed = urlparse(origin)
        frontend_url = f"{parsed.scheme}://{parsed.netloc}"
    else:
        # 回退到配置
        frontend_url = settings.frontend_url.rstrip("/")
    share_url = f"{frontend_url}/share?code={share_code}"

    return ShareResponse(
        id=share.id,
        share_code=share.share_code,
        share_url=share_url,
        share_type="entries",
        title=None,
        description=share.description,
        entry_count=len(share.entry_ids),
        created_at=share.created_at,
        expires_at=share.expires_at,
    )


@router.get("/{share_code}", response_model=ShareDetailResponse)
async def get_share(share_code: str):
    """
    获取分享详情（公开访问，无需登录）
    """
    async with async_session_maker() as db:
        # 查找分享记录
        result = await db.execute(select(Share).where(Share.share_code == share_code))
        share = result.scalar_one_or_none()

        if not share:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Share not found",
            )

        # 检查是否过期
        if share.expires_at and share.expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Share has expired",
            )

        share_type = getattr(share, 'share_type', 'entries')

        # 文本分享
        if share_type == "text":
            return ShareDetailResponse(
                share_code=share.share_code,
                share_type="text",
                title=share.title,
                description=share.description,
                text_content=share.text_content,
                entries=None,
                created_at=share.created_at,
                expires_at=share.expires_at,
            )

        # 文章分享
        entry_ids = share.entry_ids or []
        entries = await entry_service.get_entries_by_ids(db, entry_ids) if entry_ids else []

        # 转换为响应格式
        entry_responses = []
        for entry in entries:
            entry_responses.append(
                EntryResponse(
                    id=entry.id,
                    rss_source_id=entry.rss_source_id,
                    title=entry.title,
                    link=entry.link,
                    author=entry.author,
                    published_at=entry.published_at,
                    content=entry.content,
                    content_type=entry.content_type,
                    status=entry.status,
                    is_read=entry.is_read,
                    marked_at=entry.marked_at,
                    ai_summary=entry.ai_summary,
                    ai_content_type=entry.ai_content_type,
                    ai_processed_at=entry.ai_processed_at,
                    user_notes=entry.user_notes,
                    exported_to_zotero=entry.exported_to_zotero,
                    fetched_at=entry.fetched_at,
                    created_at=entry.created_at,
                    rss_source_name=entry.rss_source_name or (entry.rss_source.name if entry.rss_source else None),
                )
            )

        return ShareDetailResponse(
            share_code=share.share_code,
            share_type="entries",
            title=share.title,
            description=share.description,
            entries=entry_responses,
            text_content=None,
            created_at=share.created_at,
            expires_at=share.expires_at,
        )
