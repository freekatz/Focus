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


async def run_migrations() -> None:
    """
    运行数据库迁移

    检查并添加新列到现有表中。这是一个简单的迁移系统，
    适用于添加新列的场景。对于复杂迁移，建议使用 Alembic。
    """
    from sqlalchemy import text

    migrations = [
        # (table_name, column_name, column_definition_sqlite, column_definition_postgres)
        ("user_configs", "auto_translate_abstract", "BOOLEAN DEFAULT 1", "BOOLEAN DEFAULT TRUE"),
        ("user_configs", "auto_interpret_arxiv", "BOOLEAN DEFAULT 1", "BOOLEAN DEFAULT TRUE"),
        ("user_configs", "ai_models_translation", "TEXT", "TEXT"),
        ("user_configs", "ai_models_interpret", "TEXT", "TEXT"),
    ]

    async with engine.begin() as conn:
        is_sqlite = settings.database_url.startswith("sqlite")

        for table_name, column_name, sqlite_def, postgres_def in migrations:
            # 检查列是否存在
            if is_sqlite:
                result = await conn.execute(text(f"PRAGMA table_info({table_name})"))
                columns = [row[1] for row in result.fetchall()]
                exists = column_name in columns
            else:
                result = await conn.execute(text(f"""
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name = '{table_name}' AND column_name = '{column_name}'
                """))
                exists = result.fetchone() is not None

            if not exists:
                # 添加列
                column_def = sqlite_def if is_sqlite else postgres_def
                await conn.execute(text(
                    f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_def}"
                ))
                print(f"Migration: added column '{column_name}' to table '{table_name}'")

    # 运行 AI 配置数据迁移
    await migrate_ai_configs()


async def migrate_ai_configs() -> None:
    """
    将现有 AI 配置迁移到新的 JSON 格式

    从旧的 ai_provider, ai_model, ai_api_key, ai_base_url 字段
    迁移到新的 ai_models_translation 和 ai_models_interpret JSON 字段
    """
    import json
    import uuid
    from sqlalchemy import text

    async with async_session_maker() as db:
        # 获取所有配置
        result = await db.execute(text("SELECT id, ai_provider, ai_model, ai_api_key, ai_base_url, ai_models_translation FROM user_configs"))
        configs = result.fetchall()

        for config in configs:
            config_id, ai_provider, ai_model, ai_api_key, ai_base_url, ai_models_translation = config

            # 跳过已迁移的配置
            if ai_models_translation:
                continue

            # 构建新格式配置
            default_config = {
                "primary": {
                    "id": str(uuid.uuid4())[:8],
                    "name": "默认模型",
                    "provider": ai_provider or "openai",
                    "model": ai_model or "gpt-4o-mini",
                    "api_key": ai_api_key or "",
                    "base_url": ai_base_url
                },
                "fallbacks": []
            }

            config_json = json.dumps(default_config, ensure_ascii=False)

            # 更新配置
            await db.execute(
                text("UPDATE user_configs SET ai_models_translation = :config, ai_models_interpret = :config WHERE id = :id"),
                {"config": config_json, "id": config_id}
            )

        await db.commit()
        if configs:
            print(f"Migration: migrated AI configs for {len(configs)} user(s) to new JSON format")


async def close_db() -> None:
    """关闭数据库连接"""
    await engine.dispose()
