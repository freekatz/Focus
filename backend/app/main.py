"""
FastAPI 应用入口
"""
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from datetime import datetime, timedelta

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.config import settings
from app.database import init_db, close_db
from app.utils.logger import setup_logger, logger
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """应用生命周期管理"""
    # 启动时
    setup_logger()
    logger.info(f"Starting Focus v{settings.app_version}")
    await init_db()
    logger.info("Database initialized")

    # 初始化默认用户
    from app.services.user_service import init_default_user
    await init_default_user()

    # 启动定时任务调度器
    from app.tasks.scheduler import start_scheduler
    start_scheduler()
    logger.info("Scheduler started")

    yield

    # 关闭时
    logger.info("Shutting down...")

    # 停止调度器
    from app.tasks.scheduler import stop_scheduler
    stop_scheduler()

    await close_db()


# API 文档标签
tags_metadata = [
    {
        "name": "auth",
        "description": "用户认证相关接口，包括登录、获取当前用户信息、修改密码等",
    },
    {
        "name": "rss",
        "description": "RSS 源管理接口，包括添加、修改、删除 RSS 源",
    },
    {
        "name": "subscriptions",
        "description": "订阅管理接口，管理用户的 RSS 订阅和 RSS 市场",
    },
    {
        "name": "entries",
        "description": "文章条目管理接口，包括列表、搜索、状态更新等",
    },
    {
        "name": "ai",
        "description": "AI 功能接口，包括文章总结、提示词管理等",
    },
    {
        "name": "export",
        "description": "导出功能接口，支持导出到 Zotero 和生成个人 RSS Feed",
    },
    {
        "name": "share",
        "description": "分享功能接口，创建和获取分享链接",
    },
    {
        "name": "config",
        "description": "用户配置接口，获取和更新用户设置",
    },
    {
        "name": "system",
        "description": "系统管理接口，包括健康检查、任务触发等",
    },
]

# 创建 FastAPI 应用
app = FastAPI(
    title="Focus",
    version=settings.app_version,
    description="""
## Focus - RSS 信息源聚合与订阅平台

### 设计原则
- **反推荐、反标签**: 简化分类，避免信息茧房
- **聚焦**: 专注于当前内容，排除干扰
- **沉浸**: 流畅的浏览体验，减少打断

### 主要功能
- RSS 订阅管理和自动采集
- AI 智能总结和内容分类
- 文章快速筛选（感兴趣/不感兴趣）
- 导出到 Zotero
- 生成个人 RSS Feed
- 分享功能

### 认证方式
使用 JWT Bearer Token 认证。登录后获取 token，在请求头中添加：
```
Authorization: Bearer <your-token>
```
""",
    lifespan=lifespan,
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
def get_cors_origins() -> list[str]:
    """解析 CORS 允许的来源"""
    if settings.cors_origins == "*":
        return ["*"]
    origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
    # 确保包含 frontend_url
    if settings.frontend_url and settings.frontend_url not in origins:
        origins.append(settings.frontend_url)
    return origins

cors_origins = get_cors_origins()
allow_credentials = cors_origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
    expose_headers=["Content-Disposition"],
    max_age=600,  # 预检请求缓存 10 分钟
)

# TrustedHost 中间件 - 防止 Host Header 攻击
if settings.allowed_hosts != "*":
    allowed_hosts = [h.strip() for h in settings.allowed_hosts.split(",") if h.strip()]
    if allowed_hosts:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=allowed_hosts,
        )

# 注册 API 路由
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "app": "Focus",
        "version": settings.app_version,
    }


@app.get("/export/rss.xml", tags=["export"])
async def public_rss_feed():
    """
    公开的个人 RSS Feed

    返回前一日收藏的所有文章，无需认证即可访问。
    仅包含文章原始信息（标题、链接、作者、发布时间、内容摘要）。
    """
    from feedgenerator import Rss201rev2Feed
    from sqlalchemy import select, and_
    from app.database import async_session_maker
    from app.models.entry import Entry, EntryStatus

    # 计算前一天的时间范围
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)

    async with async_session_maker() as db:
        # 查询前一天收藏的文章（按 marked_at 时间）
        result = await db.execute(
            select(Entry)
            .where(
                and_(
                    Entry.status == EntryStatus.FAVORITE,
                    Entry.marked_at >= yesterday,
                    Entry.marked_at < today,
                )
            )
            .order_by(Entry.marked_at.desc())
        )
        entries = result.scalars().all()

        # 如果前一天没有收藏，返回最近7天的收藏
        if not entries:
            week_ago = today - timedelta(days=7)
            result = await db.execute(
                select(Entry)
                .where(
                    and_(
                        Entry.status == EntryStatus.FAVORITE,
                        Entry.marked_at >= week_ago,
                    )
                )
                .order_by(Entry.marked_at.desc())
                .limit(50)
            )
            entries = result.scalars().all()

    # 生成 RSS Feed
    frontend_url = settings.frontend_url.rstrip("/")
    feed = Rss201rev2Feed(
        title="Focus - 个人收藏",
        link=frontend_url,
        description="Focus 个人收藏文章 RSS 订阅",
        language="zh-cn",
        feed_url=f"{frontend_url}/export/rss.xml",
    )

    for entry in entries:
        # 只包含原始信息，不包含 AI 总结等附加信息
        # 截取内容摘要（最多500字符）
        description = ""
        if entry.content:
            # 简单去除HTML标签获取纯文本摘要
            import re
            text = re.sub(r'<[^>]+>', '', entry.content)
            description = text[:500] + "..." if len(text) > 500 else text

        feed.add_item(
            title=entry.title,
            link=entry.link,
            description=description,
            author_name=entry.author,
            pubdate=entry.published_at or entry.fetched_at,
            unique_id=entry.link,  # 使用原始链接作为唯一ID
        )

    # 返回 RSS XML
    rss_content = feed.writeString("utf-8")
    return Response(
        content=rss_content,
        media_type="application/rss+xml; charset=utf-8",
        headers={
            "Cache-Control": "public, max-age=3600",  # 缓存1小时
        }
    )
