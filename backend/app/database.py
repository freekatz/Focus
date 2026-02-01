"""
数据库连接与会话管理
"""
import os
from pathlib import Path
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# 确保 SQLite 数据库目录存在
if settings.database_url.startswith("sqlite"):
    # 从 database_url 中提取文件路径
    # 格式: sqlite+aiosqlite:///./data/focus.db
    db_path = settings.database_url.split("///")[-1]
    if db_path.startswith("./"):
        db_path = db_path[2:]  # 移除 ./

    # 获取目录路径
    db_dir = Path(db_path).parent

    # 如果目录不存在，创建它
    if not db_dir.exists():
        db_dir.mkdir(parents=True, exist_ok=True)
        print(f"Created database directory: {db_dir}")

# 创建异步引擎
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
)

# 创建异步会话工厂
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """SQLAlchemy 基类"""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话依赖"""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """初始化数据库（创建表）"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """关闭数据库连接"""
    await engine.dispose()
