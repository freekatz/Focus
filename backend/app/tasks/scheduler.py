"""
定时任务调度器 - APScheduler
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from app.config import settings
from app.utils.logger import logger


# 全局调度器实例
scheduler: AsyncIOScheduler | None = None


def init_scheduler() -> AsyncIOScheduler:
    """初始化调度器"""
    global scheduler

    if scheduler is not None:
        return scheduler

    scheduler = AsyncIOScheduler()

    # 注册任务
    from app.tasks.fetch_rss import fetch_all_rss_task
    from app.tasks.cleanup import cleanup_expired_entries_task

    # RSS 采集任务 - 每隔指定分钟执行
    scheduler.add_job(
        fetch_all_rss_task,
        trigger=IntervalTrigger(minutes=settings.rss_fetch_interval),
        id="fetch_all_rss",
        name="采集所有 RSS 源",
        replace_existing=True,
    )
    logger.info(f"Scheduled RSS fetch task: every {settings.rss_fetch_interval} minutes")

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
