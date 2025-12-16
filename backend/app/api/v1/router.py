"""
API v1 路由聚合
"""
from fastapi import APIRouter

from app.api.v1 import auth, rss, entries, config, ai, export, share, system, subscriptions

api_router = APIRouter()

# 注册子路由
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(rss.router, prefix="/rss", tags=["rss"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
api_router.include_router(entries.router, prefix="/entries", tags=["entries"])
api_router.include_router(config.router, prefix="/config", tags=["config"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(export.router, prefix="/export", tags=["export"])
api_router.include_router(share.router, prefix="/share", tags=["share"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
