"""
定时任务调度器 - APScheduler

支持两种刷新模式：
1. 全局定时刷新：每天固定时间刷新所有源（默认 08:00 和 20:00）
2. 单源定时刷新：每个订阅可以配置独立的刷新时间
"""
import json
from typing import List, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select

from app.database import async_session_maker
from app.models.subscription import UserRssSubscription
from app.utils.logger import logger


# 全局调度器实例
scheduler: AsyncIOScheduler | None = None

# 默认刷新时间（每天 8:00）
DEFAULT_REFRESH_SCHEDULE = ["08:00"]


def init_scheduler() -> AsyncIOScheduler:
    """初始化调度器"""
    global scheduler

    if scheduler is not None:
        return scheduler

    scheduler = AsyncIOScheduler()

    # 注册任务
    from app.tasks.fetch_rss import fetch_all_rss_task
    from app.tasks.cleanup import cleanup_expired_entries_task

    # RSS 采集任务 - 每天 8:00 和 20:00 执行（默认）
    scheduler.add_job(
        fetch_all_rss_task,
        trigger=CronTrigger(hour=8, minute=0),
        id="fetch_all_rss_morning",
        name="采集所有 RSS 源 (早)",
        replace_existing=True,
    )
    scheduler.add_job(
        fetch_all_rss_task,
        trigger=CronTrigger(hour=20, minute=0),
        id="fetch_all_rss_evening",
        name="采集所有 RSS 源 (晚)",
        replace_existing=True,
    )
    logger.info("Scheduled RSS fetch task: daily at 08:00 and 20:00")

    # 数据清理任务 - 每天凌晨 2 点执行
    scheduler.add_job(
        cleanup_expired_entries_task,
        trigger=CronTrigger(hour=2, minute=0),
        id="cleanup_expired_entries",
        name="清理过期条目",
        replace_existing=True,
    )
    logger.info("Scheduled cleanup task: daily at 02:00")

    return scheduler


def start_scheduler():
    """启动调度器"""
    global scheduler
    if scheduler is None:
        scheduler = init_scheduler()

    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started")


def stop_scheduler():
    """停止调度器"""
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")


def get_scheduler() -> Optional[AsyncIOScheduler]:
    """获取调度器实例"""
    return scheduler


async def add_source_refresh_job(source_id: int, schedule: List[str]):
    """
    为单个源添加定时刷新任务

    Args:
        source_id: RSS 源 ID
        schedule: 刷新时间列表，如 ["08:00", "20:00"]
    """
    global scheduler
    if scheduler is None:
        logger.warning("Scheduler not initialized")
        return

    from app.tasks.fetch_rss import fetch_single_source_task

    # 先移除该源的所有旧任务
    await remove_source_refresh_jobs(source_id)

    # 添加新任务
    for time_str in schedule:
        try:
            hour, minute = map(int, time_str.split(':'))
            job_id = f"refresh_source_{source_id}_{time_str.replace(':', '')}"

            scheduler.add_job(
                fetch_single_source_task,
                trigger=CronTrigger(hour=hour, minute=minute),
                args=[source_id],
                id=job_id,
                name=f"刷新源 {source_id} ({time_str})",
                replace_existing=True,
            )
            logger.info(f"Added refresh job for source {source_id} at {time_str}")

        except ValueError as e:
            logger.error(f"Invalid time format '{time_str}': {e}")


async def remove_source_refresh_jobs(source_id: int):
    """
    移除单个源的所有定时刷新任务

    Args:
        source_id: RSS 源 ID
    """
    global scheduler
    if scheduler is None:
        return

    # 查找并移除所有该源的任务
    jobs_to_remove = []
    for job in scheduler.get_jobs():
        if job.id.startswith(f"refresh_source_{source_id}_"):
            jobs_to_remove.append(job.id)

    for job_id in jobs_to_remove:
        scheduler.remove_job(job_id)
        logger.info(f"Removed refresh job: {job_id}")


async def update_subscription_schedule(subscription_id: int, schedule: List[str]):
    """
    更新订阅的刷新时间配置

    Args:
        subscription_id: 订阅 ID
        schedule: 刷新时间列表
    """
    async with async_session_maker() as db:
        result = await db.execute(
            select(UserRssSubscription).where(UserRssSubscription.id == subscription_id)
        )
        subscription = result.scalar_one_or_none()

        if not subscription:
            logger.warning(f"Subscription {subscription_id} not found")
            return

        # 更新调度任务
        await add_source_refresh_job(subscription.rss_source_id, schedule)


def parse_refresh_schedule(schedule_json: Optional[str]) -> List[str]:
    """
    解析刷新时间配置

    Args:
        schedule_json: JSON 格式的时间列表，如 '["08:00", "20:00"]'

    Returns:
        时间列表
    """
    if not schedule_json:
        return DEFAULT_REFRESH_SCHEDULE

    try:
        schedule = json.loads(schedule_json)
        if isinstance(schedule, list):
            return schedule
    except json.JSONDecodeError:
        pass

    return DEFAULT_REFRESH_SCHEDULE


def get_available_refresh_times() -> List[dict]:
    """
    获取可用的刷新时间选项

    Returns:
        可选时间列表
    """
    return [
        {"label": "每天 6:00", "value": "06:00"},
        {"label": "每天 8:00", "value": "08:00"},
        {"label": "每天 12:00", "value": "12:00"},
        {"label": "每天 18:00", "value": "18:00"},
        {"label": "每天 20:00", "value": "20:00"},
        {"label": "每天 22:00", "value": "22:00"},
    ]
