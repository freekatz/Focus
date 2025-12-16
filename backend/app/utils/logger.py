"""
日志配置 - 使用 Loguru
"""
import sys
from pathlib import Path

from loguru import logger

from app.config import settings


def setup_logger() -> None:
    """配置日志"""
    # 移除默认处理器
    logger.remove()

    # 日志格式
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    )

    # 添加控制台输出
    logger.add(
        sys.stdout,
        format=log_format,
        level=settings.log_level,
        colorize=True,
    )

    # 添加文件输出
    if settings.log_file:
        log_path = Path(settings.log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        logger.add(
            settings.log_file,
            format=log_format,
            level=settings.log_level,
            rotation="10 MB",
            retention="7 days",
            compression="zip",
            encoding="utf-8",
        )

    logger.info(f"Logger initialized with level: {settings.log_level}")


# 导出 logger 实例
__all__ = ["logger", "setup_logger"]
