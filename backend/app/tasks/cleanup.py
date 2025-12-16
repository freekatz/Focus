"""
数据清理定时任务
"""
from sqlalchemy import select

from app.database import async_session_maker
from app.models.user_config import UserConfig
from app.services.entry_service import cleanup_expired_entries, archive_old_entries
from app.utils.logger import logger


async def cleanup_expired_entries_task():
    """
    定时任务：清理过期的条目
    - 未标记的条目：超过 N 天删除
    - 垃圾桶的条目：超过 N 天删除
    - 感兴趣/收藏的条目：超过 N 天归档
    """
    logger.info("Starting cleanup task...")

    async with async_session_maker() as db:
        # 获取用户配置（单用户，获取第一个配置）
        result = await db.execute(select(UserConfig).limit(1))
        config = result.scalar_one_or_none()

        if not config:
            logger.warning("No user config found, using default retention policy")
            unmarked_days = 30
            trash_days = 15
            archive_days = 90
        else:
            unmarked_days = config.unmarked_retention_days
            trash_days = config.trash_retention_days
            archive_days = getattr(config, 'archive_after_days', 90)

        # 执行清理
        deleted_count = await cleanup_expired_entries(db, unmarked_days, trash_days)

        # 执行归档
        archived_count = await archive_old_entries(db, archive_days)

        logger.info(
            f"Cleanup task completed: deleted {deleted_count} expired entries "
            f"(unmarked>{unmarked_days}d, trash>{trash_days}d), "
            f"archived {archived_count} old entries (>{archive_days}d)"
        )
