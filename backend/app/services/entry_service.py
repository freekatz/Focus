"""
文章条目服务 - 处理条目相关业务逻辑
"""
import random
from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Literal

from sqlalchemy import select, func, update, delete, and_, or_, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.entry import Entry, EntryStatus
from app.models.rss import RssSource
from app.utils.logger import logger


async def get_entries(
    db: AsyncSession,
    status: Optional[EntryStatus] = None,
    rss_source_id: Optional[int] = None,
    category: Optional[str] = None,
    period: Optional[Literal["today", "past"]] = None,
    is_read: Optional[bool] = None,
    skip: int = 0,
    limit: int = 20,
) -> Tuple[List[Entry], int]:
    """获取条目列表"""
    query = select(Entry).options(selectinload(Entry.rss_source))

    # 状态筛选
    if status:
        query = query.where(Entry.status == status)

    # 来源筛选
    if rss_source_id:
        query = query.where(Entry.rss_source_id == rss_source_id)

    # 分类筛选（基于 RSS 源的分类）
    if category:
        query = query.join(RssSource).where(RssSource.category == category)

    # 时间筛选（仅基于首次采集时间 fetched_at）
    if period:
        # 获取本地时间的今日开始时间，然后转换为 UTC（数据库存储的是 UTC 时间）
        local_today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        utc_offset = datetime.now() - datetime.utcnow()
        today_start_utc = local_today_start - utc_offset

        if period == "today":
            # 基于 fetched_at 判断是否为今日
            query = query.where(Entry.fetched_at >= today_start_utc)
        elif period == "past":
            # 基于 fetched_at 判断是否为过去
            query = query.where(Entry.fetched_at < today_start_utc)

    # 已读筛选
    if is_read is not None:
        query = query.where(Entry.is_read == is_read)

    # 获取总数
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # 排序：状态优先级 > display_order > 时间
    # 优先级：interested(1) > unread(2) > favorite(3) > archived(4) > trash(5)
    status_priority = case(
        (Entry.status == EntryStatus.INTERESTED, 1),
        (Entry.status == EntryStatus.UNREAD, 2),
        (Entry.status == EntryStatus.FAVORITE, 3),
        (Entry.status == EntryStatus.ARCHIVED, 4),
        (Entry.status == EntryStatus.TRASH, 5),
        else_=99
    )
    # 对于未读条目，优先使用 display_order 排序（支持随机打乱）
    query = query.order_by(status_priority, Entry.display_order.desc(), Entry.fetched_at.desc().nullslast())
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def get_entry_by_id(db: AsyncSession, entry_id: int) -> Optional[Entry]:
    """根据 ID 获取条目"""
    result = await db.execute(
        select(Entry).options(selectinload(Entry.rss_source)).where(Entry.id == entry_id)
    )
    return result.scalar_one_or_none()


async def get_entries_by_ids(db: AsyncSession, entry_ids: List[int]) -> List[Entry]:
    """根据 ID 列表获取条目"""
    result = await db.execute(
        select(Entry).options(selectinload(Entry.rss_source)).where(Entry.id.in_(entry_ids))
    )
    return list(result.scalars().all())


async def update_entry_status(db: AsyncSession, entry: Entry, status: EntryStatus) -> Entry:
    """更新条目状态"""
    old_status = entry.status
    entry.status = status
    entry.marked_at = datetime.utcnow()

    # 更新已读状态
    if status != EntryStatus.UNREAD:
        entry.is_read = True

    # 更新 RSS 源的未读计数（仅当源存在时）
    if entry.rss_source_id:
        if old_status == EntryStatus.UNREAD and status != EntryStatus.UNREAD:
            await db.execute(
                update(RssSource)
                .where(RssSource.id == entry.rss_source_id)
                .values(unread_count=RssSource.unread_count - 1)
            )
        elif old_status != EntryStatus.UNREAD and status == EntryStatus.UNREAD:
            await db.execute(
                update(RssSource)
                .where(RssSource.id == entry.rss_source_id)
                .values(unread_count=RssSource.unread_count + 1)
            )

    await db.commit()
    await db.refresh(entry)
    return entry


async def batch_update_status(
    db: AsyncSession, entry_ids: List[int], status: EntryStatus
) -> int:
    """批量更新条目状态"""
    now = datetime.utcnow()

    # 获取当前状态为 UNREAD 的条目数（用于更新未读计数，排除源已删除的条目）
    unread_result = await db.execute(
        select(Entry.rss_source_id, func.count(Entry.id))
        .where(
            Entry.id.in_(entry_ids),
            Entry.status == EntryStatus.UNREAD,
            Entry.rss_source_id.isnot(None)
        )
        .group_by(Entry.rss_source_id)
    )
    unread_by_source = {row[0]: row[1] for row in unread_result.all()}

    # 准备更新值
    update_values = {
        "status": status,
        "marked_at": now,
    }
    # 如果不是恢复为未读状态，则标记为已读
    if status != EntryStatus.UNREAD:
        update_values["is_read"] = True

    # 批量更新状态
    result = await db.execute(
        update(Entry)
        .where(Entry.id.in_(entry_ids))
        .values(**update_values)
    )

    # 更新 RSS 源的未读计数
    if status != EntryStatus.UNREAD:
        for source_id, count in unread_by_source.items():
            await db.execute(
                update(RssSource)
                .where(RssSource.id == source_id)
                .values(unread_count=RssSource.unread_count - count)
            )

    await db.commit()
    return result.rowcount


async def mark_entry_read(db: AsyncSession, entry: Entry) -> Entry:
    """标记条目为已读"""
    if not entry.is_read:
        entry.is_read = True
        # 更新 RSS 源的未读计数（仅当源存在时）
        if entry.rss_source_id and entry.status == EntryStatus.UNREAD:
            await db.execute(
                update(RssSource)
                .where(RssSource.id == entry.rss_source_id)
                .values(unread_count=RssSource.unread_count - 1)
            )
        await db.commit()
        await db.refresh(entry)
    return entry


async def batch_mark_read(db: AsyncSession, entry_ids: List[int]) -> int:
    """批量标记已读"""
    # 获取未读条目数（排除源已删除的条目）
    unread_result = await db.execute(
        select(Entry.rss_source_id, func.count(Entry.id))
        .where(
            Entry.id.in_(entry_ids),
            Entry.is_read == False,
            Entry.rss_source_id.isnot(None)
        )
        .group_by(Entry.rss_source_id)
    )
    unread_by_source = {row[0]: row[1] for row in unread_result.all()}

    # 批量标记
    result = await db.execute(
        update(Entry).where(Entry.id.in_(entry_ids)).values(is_read=True)
    )

    # 更新未读计数
    for source_id, count in unread_by_source.items():
        await db.execute(
            update(RssSource)
            .where(RssSource.id == source_id)
            .values(unread_count=RssSource.unread_count - count)
        )

    await db.commit()
    return result.rowcount


async def update_entry_notes(db: AsyncSession, entry: Entry, notes: Optional[str]) -> Entry:
    """更新条目笔记"""
    entry.user_notes = notes
    entry.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(entry)
    return entry


async def search_entries(
    db: AsyncSession,
    query_text: str,
    status: Optional[EntryStatus] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 20,
) -> Tuple[List[Entry], int]:
    """搜索条目"""
    query = select(Entry).options(selectinload(Entry.rss_source))

    # 关键词搜索（标题和内容）
    search_pattern = f"%{query_text}%"
    query = query.where(
        or_(
            Entry.title.ilike(search_pattern),
            Entry.content.ilike(search_pattern),
            Entry.ai_summary.ilike(search_pattern),
        )
    )

    if status:
        query = query.where(Entry.status == status)

    if from_date:
        query = query.where(Entry.published_at >= from_date)

    if to_date:
        query = query.where(Entry.published_at <= to_date)

    # 获取总数
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # 排序：与普通列表保持一致 - 状态优先级 > 采集时间
    # 优先级：interested(1) > unread(2) > favorite(3) > archived(4) > trash(5)
    status_priority = case(
        (Entry.status == EntryStatus.INTERESTED, 1),
        (Entry.status == EntryStatus.UNREAD, 2),
        (Entry.status == EntryStatus.FAVORITE, 3),
        (Entry.status == EntryStatus.ARCHIVED, 4),
        (Entry.status == EntryStatus.TRASH, 5),
        else_=99
    )
    query = query.order_by(status_priority, Entry.fetched_at.desc().nullslast())
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def get_entry_stats(db: AsyncSession) -> dict:
    """获取条目统计"""
    # 总数
    total = (await db.execute(select(func.count(Entry.id)))).scalar() or 0

    # 按状态统计
    status_result = await db.execute(
        select(Entry.status, func.count(Entry.id)).group_by(Entry.status)
    )
    by_status = {row[0].value: row[1] for row in status_result}

    # 今日数量（仅基于首次采集时间 fetched_at）
    local_today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    utc_offset = datetime.now() - datetime.utcnow()
    today_start_utc = local_today_start - utc_offset
    today_count = (
        await db.execute(
            select(func.count(Entry.id)).where(Entry.fetched_at >= today_start_utc)
        )
    ).scalar() or 0

    # 未读数量
    unread_count = by_status.get(EntryStatus.UNREAD.value, 0)

    return {
        "total": total,
        "by_status": by_status,
        "today_count": today_count,
        "unread_count": unread_count,
    }


async def cleanup_expired_entries(db: AsyncSession, unmarked_days: int, trash_days: int) -> int:
    """清理过期条目"""
    now = datetime.utcnow()
    deleted_count = 0

    # 清理过期的未读条目
    unmarked_cutoff = now - timedelta(days=unmarked_days)
    result = await db.execute(
        delete(Entry).where(
            Entry.status == EntryStatus.UNREAD,
            Entry.fetched_at < unmarked_cutoff,
        )
    )
    deleted_count += result.rowcount

    # 清理过期的垃圾桶条目
    trash_cutoff = now - timedelta(days=trash_days)
    result = await db.execute(
        delete(Entry).where(
            Entry.status == EntryStatus.TRASH,
            Entry.marked_at < trash_cutoff,
        )
    )
    deleted_count += result.rowcount

    await db.commit()
    logger.info(f"Cleaned up {deleted_count} expired entries")
    return deleted_count


async def shuffle_unread_entries(db: AsyncSession) -> int:
    """随机打乱未读条目的显示顺序"""
    # 获取所有未读条目
    result = await db.execute(
        select(Entry.id).where(Entry.status == EntryStatus.UNREAD)
    )
    entry_ids = [row[0] for row in result.all()]

    if not entry_ids:
        return 0

    # 生成随机顺序
    random.shuffle(entry_ids)

    # 批量更新 display_order
    for order, entry_id in enumerate(entry_ids):
        await db.execute(
            update(Entry)
            .where(Entry.id == entry_id)
            .values(display_order=len(entry_ids) - order)  # 倒序，让第一个有最大的 order
        )

    await db.commit()
    return len(entry_ids)


async def archive_old_entries(db: AsyncSession, archive_after_days: int) -> int:
    """归档超过指定天数的感兴趣/收藏条目"""
    now = datetime.utcnow()
    archive_cutoff = now - timedelta(days=archive_after_days)

    # 将超过 archive_after_days 天的感兴趣/收藏条目归档
    result = await db.execute(
        update(Entry)
        .where(
            Entry.status.in_([EntryStatus.INTERESTED, EntryStatus.FAVORITE]),
            Entry.marked_at < archive_cutoff,
        )
        .values(status=EntryStatus.ARCHIVED)
    )

    archived_count = result.rowcount
    await db.commit()

    if archived_count > 0:
        logger.info(f"Archived {archived_count} old entries (> {archive_after_days} days)")

    return archived_count
