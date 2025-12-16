"""
订阅管理 API
"""
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Query

from app.api.deps import DbSession, CurrentUser
from app.models.rss import RssCategory
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionResponse,
    SubscriptionListResponse,
    BatchSubscribeRequest,
    BatchSubscribeResponse,
    RssMarketListResponse,
    RssBatchImportRequest,
    RssBatchImportResponse,
)
from app.services import subscription_service

router = APIRouter()


# ============= 我的订阅 =============

@router.get("/my", response_model=SubscriptionListResponse)
async def list_my_subscriptions(
    db: DbSession,
    current_user: CurrentUser,
    category: Optional[RssCategory] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """获取我的订阅列表"""
    items, total = await subscription_service.get_user_subscriptions(
        db, current_user.id, category=category, is_active=is_active, skip=skip, limit=limit
    )
    return SubscriptionListResponse(items=items, total=total)


@router.post("/subscribe", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def subscribe_rss(
    data: SubscriptionCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    """订阅一个 RSS 源"""
    subscription = await subscription_service.create_subscription(db, current_user.id, data)
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="RSS source not found or already subscribed"
        )

    source = subscription.rss_source
    return SubscriptionResponse(
        id=subscription.id,
        rss_source_id=subscription.rss_source_id,
        is_active=subscription.is_active,
        custom_fetch_interval=subscription.custom_fetch_interval,
        created_at=subscription.created_at,
        rss_source_name=source.name,
        rss_source_url=source.url,
        rss_source_category=source.category,
        rss_source_description=source.description,
        entry_count=source.entry_count,
        unread_count=source.unread_count,
        last_fetched_at=source.last_fetched_at,
        last_fetch_status=source.last_fetch_status,
    )


@router.post("/subscribe/batch", response_model=BatchSubscribeResponse)
async def batch_subscribe_rss(
    data: BatchSubscribeRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """批量订阅 RSS 源"""
    result = await subscription_service.batch_subscribe(db, current_user.id, data.rss_source_ids)
    return BatchSubscribeResponse(**result)


@router.put("/my/{subscription_id}", response_model=SubscriptionResponse)
async def update_my_subscription(
    subscription_id: int,
    data: SubscriptionUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    """更新我的订阅配置"""
    subscription = await subscription_service.get_subscription_by_id(db, subscription_id, current_user.id)
    if not subscription:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    updated = await subscription_service.update_subscription(db, subscription, data)
    source = updated.rss_source

    return SubscriptionResponse(
        id=updated.id,
        rss_source_id=updated.rss_source_id,
        is_active=updated.is_active,
        custom_fetch_interval=updated.custom_fetch_interval,
        created_at=updated.created_at,
        rss_source_name=source.name,
        rss_source_url=source.url,
        rss_source_category=source.category,
        rss_source_description=source.description,
        entry_count=source.entry_count,
        unread_count=source.unread_count,
        last_fetched_at=source.last_fetched_at,
        last_fetch_status=source.last_fetch_status,
    )


@router.delete("/my/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe_rss(
    subscription_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    """取消订阅"""
    subscription = await subscription_service.get_subscription_by_id(db, subscription_id, current_user.id)
    if not subscription:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    await subscription_service.delete_subscription(db, subscription)


# ============= RSS 市场 =============

@router.get("/market", response_model=RssMarketListResponse)
async def list_rss_market(
    db: DbSession,
    current_user: CurrentUser,
    category: Optional[RssCategory] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """获取 RSS 市场列表"""
    items, total = await subscription_service.get_rss_market(
        db, current_user.id, category=category, skip=skip, limit=limit
    )
    return RssMarketListResponse(items=items, total=total)


@router.post("/market/import", response_model=RssBatchImportResponse)
async def import_rss_to_market(
    data: RssBatchImportRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """批量导入 RSS 源到市场"""
    result = await subscription_service.batch_import_rss(db, data.items)
    return RssBatchImportResponse(**result)
