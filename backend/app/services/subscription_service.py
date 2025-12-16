"""
订阅服务
"""
from typing import Optional, List, Tuple

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.rss import RssSource, RssCategory
from app.models.subscription import UserRssSubscription
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionResponse,
    RssMarketItemResponse,
    RssBatchImportItem,
)
from app.utils.hash import generate_hash


async def get_user_subscriptions(
    db: AsyncSession,
    user_id: int,
    category: Optional[RssCategory] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[SubscriptionResponse], int]:
    """获取用户订阅列表"""
    query = (
        select(UserRssSubscription)
        .where(UserRssSubscription.user_id == user_id)
        .options(selectinload(UserRssSubscription.rss_source))
    )

    # 筛选条件
    if is_active is not None:
        query = query.where(UserRssSubscription.is_active == is_active)

    # 先获取总数
    count_query = select(func.count()).select_from(
        query.subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 分页
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    subscriptions = result.scalars().all()

    # 转换响应，应用 category 筛选（在关系加载后）
    items = []
    for sub in subscriptions:
        source = sub.rss_source
        if category and source.category != category:
            continue

        items.append(SubscriptionResponse(
            id=sub.id,
            rss_source_id=sub.rss_source_id,
            is_active=sub.is_active,
            custom_fetch_interval=sub.custom_fetch_interval,
            created_at=sub.created_at,
            rss_source_name=source.name,
            rss_source_url=source.url,
            rss_source_category=source.category,
            rss_source_description=source.description,
            entry_count=source.entry_count,
            unread_count=source.unread_count,
            last_fetched_at=source.last_fetched_at,
            last_fetch_status=source.last_fetch_status,
        ))

    return items, total


async def get_subscription_by_id(
    db: AsyncSession, subscription_id: int, user_id: int
) -> Optional[UserRssSubscription]:
    """根据 ID 获取订阅"""
    result = await db.execute(
        select(UserRssSubscription)
        .where(
            UserRssSubscription.id == subscription_id,
            UserRssSubscription.user_id == user_id
        )
        .options(selectinload(UserRssSubscription.rss_source))
    )
    return result.scalar_one_or_none()


async def create_subscription(
    db: AsyncSession, user_id: int, data: SubscriptionCreate
) -> Optional[UserRssSubscription]:
    """创建订阅"""
    # 检查 RSS 源是否存在
    source_result = await db.execute(
        select(RssSource).where(RssSource.id == data.rss_source_id)
    )
    source = source_result.scalar_one_or_none()
    if not source:
        return None

    # 检查是否已订阅
    existing = await db.execute(
        select(UserRssSubscription).where(
            UserRssSubscription.user_id == user_id,
            UserRssSubscription.rss_source_id == data.rss_source_id
        )
    )
    if existing.scalar_one_or_none():
        return None  # 已订阅

    subscription = UserRssSubscription(
        user_id=user_id,
        rss_source_id=data.rss_source_id,
        is_active=data.is_active,
        custom_fetch_interval=data.custom_fetch_interval,
    )
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)

    # 加载关系
    result = await db.execute(
        select(UserRssSubscription)
        .where(UserRssSubscription.id == subscription.id)
        .options(selectinload(UserRssSubscription.rss_source))
    )
    return result.scalar_one()


async def update_subscription(
    db: AsyncSession, subscription: UserRssSubscription, data: SubscriptionUpdate
) -> UserRssSubscription:
    """更新订阅"""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subscription, field, value)

    await db.commit()
    await db.refresh(subscription)
    return subscription


async def delete_subscription(db: AsyncSession, subscription: UserRssSubscription):
    """删除订阅"""
    await db.delete(subscription)
    await db.commit()


async def batch_subscribe(
    db: AsyncSession, user_id: int, rss_source_ids: List[int]
) -> dict:
    """批量订阅"""
    result = {"success": [], "already_subscribed": [], "not_found": []}

    for source_id in rss_source_ids:
        # 检查 RSS 源是否存在
        source_result = await db.execute(
            select(RssSource).where(RssSource.id == source_id)
        )
        source = source_result.scalar_one_or_none()
        if not source:
            result["not_found"].append(source_id)
            continue

        # 检查是否已订阅
        existing = await db.execute(
            select(UserRssSubscription).where(
                UserRssSubscription.user_id == user_id,
                UserRssSubscription.rss_source_id == source_id
            )
        )
        if existing.scalar_one_or_none():
            result["already_subscribed"].append(source_id)
            continue

        # 创建订阅
        subscription = UserRssSubscription(
            user_id=user_id,
            rss_source_id=source_id,
            is_active=True,
        )
        db.add(subscription)
        result["success"].append(source_id)

    await db.commit()
    return result


async def get_rss_market(
    db: AsyncSession,
    user_id: int,
    category: Optional[RssCategory] = None,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[RssMarketItemResponse], int]:
    """获取 RSS 市场列表（所有 RSS 源，标记用户是否已订阅）"""
    # 获取用户已订阅的 source_id 列表
    sub_result = await db.execute(
        select(UserRssSubscription.rss_source_id).where(
            UserRssSubscription.user_id == user_id
        )
    )
    subscribed_ids = set(row[0] for row in sub_result.fetchall())

    # 构建 RSS 源查询
    query = select(RssSource)
    if category:
        query = query.where(RssSource.category == category)

    # 总数
    count_query = select(func.count()).select_from(RssSource)
    if category:
        count_query = count_query.where(RssSource.category == category)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 分页
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    sources = result.scalars().all()

    items = [
        RssMarketItemResponse(
            id=source.id,
            name=source.name,
            url=source.url,
            website_url=source.website_url,
            description=source.description,
            category=source.category,
            icon_url=source.icon_url,
            entry_count=source.entry_count,
            is_subscribed=source.id in subscribed_ids,
        )
        for source in sources
    ]

    return items, total


async def batch_import_rss(
    db: AsyncSession, items: List[RssBatchImportItem]
) -> dict:
    """批量导入 RSS 源到市场"""
    result = {"success": 0, "failed": 0, "errors": []}

    for item in items:
        try:
            # 检查 URL 是否已存在
            url_hash = generate_hash(item.url)
            existing = await db.execute(
                select(RssSource).where(RssSource.url_hash == url_hash)
            )
            if existing.scalar_one_or_none():
                result["failed"] += 1
                result["errors"].append(f"URL already exists: {item.url}")
                continue

            # 创建 RSS 源
            source = RssSource(
                name=item.name,
                url=item.url,
                url_hash=url_hash,
                category=item.category,
                description=item.description,
                is_active=False,  # 市场中的源默认不自动采集
            )
            db.add(source)
            result["success"] += 1

        except Exception as e:
            result["failed"] += 1
            result["errors"].append(f"Failed to import {item.url}: {str(e)}")

    await db.commit()
    return result
