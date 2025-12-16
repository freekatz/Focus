"""
系统管理 API
"""
from fastapi import APIRouter, BackgroundTasks

from app.api.deps import CurrentUser
from app.tasks.fetch_rss import fetch_all_rss_task
from app.tasks.cleanup import cleanup_expired_entries_task

router = APIRouter()


@router.post("/tasks/fetch")
async def trigger_fetch_task(
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
):
    """手动触发 RSS 采集任务"""
    background_tasks.add_task(fetch_all_rss_task)
    return {"message": "RSS fetch task triggered", "status": "running"}


@router.post("/tasks/cleanup")
async def trigger_cleanup_task(
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
):
    """手动触发数据清理任务"""
    background_tasks.add_task(cleanup_expired_entries_task)
    return {"message": "Cleanup task triggered", "status": "running"}


@router.get("/health")
async def health_check():
    """健康检查（无需认证）"""
    from app.config import settings
    return {
        "status": "healthy",
        "app": "Focus",
        "version": settings.app_version,
    }
