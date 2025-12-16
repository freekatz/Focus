"""
RSS 采集定时任务
"""
from sqlalchemy import select

from app.database import async_session_maker
from app.models.rss import RssSource
from app.services.rss_service import fetch_rss_entries
from app.utils.logger import logger


async def fetch_all_rss_task():
    """
    定时任务：采集所有活跃的 RSS 源
    """
    logger.info("Starting RSS fetch task...")

    async with async_session_maker() as db:
        # 获取所有活跃的 RSS 源
        result = await db.execute(
            select(RssSource).where(RssSource.is_active == True)
        )
        sources = list(result.scalars().all())

        if not sources:
            logger.info("No active RSS sources found")
            return

        total_fetched = 0
        total_new = 0
        success_count = 0
        failed_count = 0

        for source in sources:
            try:
                fetched, new = await fetch_rss_entries(db, source)
                total_fetched += fetched
                total_new += new

                if source.last_fetch_status == "success":
                    success_count += 1
                else:
                    failed_count += 1

            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to fetch RSS '{source.name}': {e}")

        logger.info(
            f"RSS fetch task completed: "
            f"{success_count} success, {failed_count} failed, "
            f"{total_fetched} total entries, {total_new} new entries"
        )
