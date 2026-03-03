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
    pool_pre_ping=True,        # 使用前检测连接是否存活，自动丢弃已断开的连接
    pool_recycle=600,           # 10 分钟回收连接，防止被数据库端关闭
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
        ("user_configs", "ai_models", "TEXT", "TEXT"),
        # 统一任务状态新列
        ("entries", "task_translation_status", "VARCHAR(20)", "VARCHAR(20)"),
        ("entries", "task_interpret_status", "VARCHAR(50)", "VARCHAR(50)"),
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

    # 运行统一模型池迁移
    await migrate_to_unified_ai_models()

    # 运行任务结构迁移（flat list -> {model_ids, enabled}）
    await migrate_tasks_to_abstract_format()

    # 迁移旧的任务状态列到新的统一列
    await migrate_to_task_status_columns()


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


async def migrate_to_unified_ai_models() -> None:
    """
    将 ai_models_translation + ai_models_interpret 迁移到统一的 ai_models 格式

    新格式:
    {
        "models": { "id": { "name", "provider", "model", "api_key", "base_url" } },
        "tasks": { "translation": [id1, id2], "interpret": [id1, id2] }
    }
    """
    import json
    from sqlalchemy import text

    async with async_session_maker() as db:
        result = await db.execute(text(
            "SELECT id, ai_models_translation, ai_models_interpret, ai_models, "
            "ai_provider, ai_model, ai_api_key, ai_base_url FROM user_configs"
        ))
        configs = result.fetchall()

        migrated_count = 0
        for config in configs:
            (config_id, ai_models_translation, ai_models_interpret, ai_models,
             ai_provider, ai_model, ai_api_key, ai_base_url) = config

            # 跳过已迁移的配置
            if ai_models:
                continue

            models = {}
            translation_ids = []
            interpret_ids = []

            # 解析翻译配置
            if ai_models_translation:
                try:
                    trans_config = json.loads(ai_models_translation)
                    primary = trans_config.get("primary")
                    if primary and primary.get("api_key"):
                        mid = primary.get("id", "")
                        models[mid] = {
                            "name": primary.get("name", ""),
                            "provider": primary.get("provider", "openai"),
                            "model": primary.get("model", ""),
                            "api_key": primary.get("api_key", ""),
                            "base_url": primary.get("base_url"),
                        }
                        translation_ids.append(mid)
                    for fb in trans_config.get("fallbacks", []):
                        if fb.get("api_key"):
                            fid = fb.get("id", "")
                            models[fid] = {
                                "name": fb.get("name", ""),
                                "provider": fb.get("provider", "openai"),
                                "model": fb.get("model", ""),
                                "api_key": fb.get("api_key", ""),
                                "base_url": fb.get("base_url"),
                            }
                            translation_ids.append(fid)
                except json.JSONDecodeError:
                    pass

            # 解析解读配置
            if ai_models_interpret:
                try:
                    interp_config = json.loads(ai_models_interpret)
                    primary = interp_config.get("primary")
                    if primary and primary.get("api_key"):
                        mid = primary.get("id", "")
                        # 检查是否已存在相同模型（按全部字段匹配）
                        existing_id = None
                        for eid, emodel in models.items():
                            if (emodel["provider"] == primary.get("provider", "openai")
                                    and emodel["model"] == primary.get("model", "")
                                    and emodel["api_key"] == primary.get("api_key", "")
                                    and emodel["base_url"] == primary.get("base_url")):
                                existing_id = eid
                                break
                        if existing_id:
                            interpret_ids.append(existing_id)
                        else:
                            models[mid] = {
                                "name": primary.get("name", ""),
                                "provider": primary.get("provider", "openai"),
                                "model": primary.get("model", ""),
                                "api_key": primary.get("api_key", ""),
                                "base_url": primary.get("base_url"),
                            }
                            interpret_ids.append(mid)
                    for fb in interp_config.get("fallbacks", []):
                        if fb.get("api_key"):
                            fid = fb.get("id", "")
                            existing_id = None
                            for eid, emodel in models.items():
                                if (emodel["provider"] == fb.get("provider", "openai")
                                        and emodel["model"] == fb.get("model", "")
                                        and emodel["api_key"] == fb.get("api_key", "")
                                        and emodel["base_url"] == fb.get("base_url")):
                                    existing_id = eid
                                    break
                            if existing_id:
                                interpret_ids.append(existing_id)
                            else:
                                models[fid] = {
                                    "name": fb.get("name", ""),
                                    "provider": fb.get("provider", "openai"),
                                    "model": fb.get("model", ""),
                                    "api_key": fb.get("api_key", ""),
                                    "base_url": fb.get("base_url"),
                                }
                                interpret_ids.append(fid)
                except json.JSONDecodeError:
                    pass

            # 如果没有任何模型且有旧配置，从 legacy 字段创建
            if not models and ai_api_key:
                import uuid
                mid = str(uuid.uuid4())[:8]
                models[mid] = {
                    "name": "默认模型",
                    "provider": ai_provider or "openai",
                    "model": ai_model or "gpt-4o-mini",
                    "api_key": ai_api_key,
                    "base_url": ai_base_url,
                }
                translation_ids = [mid]
                interpret_ids = [mid]

            if models:
                unified = {
                    "models": models,
                    "tasks": {
                        "translation": {
                            "model_ids": translation_ids,
                            "enabled": True,
                        },
                        "interpret": {
                            "model_ids": interpret_ids,
                            "enabled": True,
                        },
                    }
                }
                unified_json = json.dumps(unified, ensure_ascii=False)
                await db.execute(
                    text("UPDATE user_configs SET ai_models = :config WHERE id = :id"),
                    {"config": unified_json, "id": config_id}
                )
                migrated_count += 1

        await db.commit()
        if migrated_count > 0:
            print(f"Migration: migrated {migrated_count} user(s) to unified ai_models format")


async def migrate_tasks_to_abstract_format() -> None:
    """
    将 ai_models JSON 中的任务从平面列表格式迁移到抽象格式

    旧格式: tasks: { "translation": ["id1", "id2"], "interpret": ["id1"] }
    新格式: tasks: { "translation": { "model_ids": ["id1", "id2"], "enabled": true }, ... }

    同时将 auto_translate_abstract 和 auto_interpret_arxiv 的值迁移到新格式的 enabled 字段
    """
    import json
    from sqlalchemy import text

    async with async_session_maker() as db:
        result = await db.execute(text(
            "SELECT id, ai_models, auto_translate_abstract, auto_interpret_arxiv FROM user_configs"
        ))
        configs = result.fetchall()

        migrated_count = 0
        for config in configs:
            config_id, ai_models, auto_translate, auto_interpret = config

            if not ai_models:
                continue

            try:
                data = json.loads(ai_models)
            except json.JSONDecodeError:
                continue

            tasks = data.get("tasks", {})
            needs_migration = False

            for task_name in list(tasks.keys()):
                task_data = tasks[task_name]
                if isinstance(task_data, list):
                    # Old flat format — migrate
                    enabled = True
                    if task_name == "translation" and auto_translate is not None:
                        enabled = bool(auto_translate)
                    elif task_name == "interpret" and auto_interpret is not None:
                        enabled = bool(auto_interpret)
                    tasks[task_name] = {
                        "model_ids": task_data,
                        "enabled": enabled,
                    }
                    needs_migration = True

            if needs_migration:
                data["tasks"] = tasks
                updated_json = json.dumps(data, ensure_ascii=False)
                await db.execute(
                    text("UPDATE user_configs SET ai_models = :config WHERE id = :id"),
                    {"config": updated_json, "id": config_id}
                )
                migrated_count += 1

        await db.commit()
        if migrated_count > 0:
            print(f"Migration: migrated {migrated_count} user(s) to abstract task format")


async def migrate_to_task_status_columns() -> None:
    """
    将旧的 translation_status 和 ai_content_type 列数据迁移到新的统一任务状态列

    旧列 → 新列:
      translation_status → task_translation_status (translating → running，其余不变)
      ai_content_type → task_interpret_status (interpreting → running, arxiv_interpretation → completed,
                                                error → failed, no_html → skipped)

    迁移是幂等的：只更新新列为 NULL 且旧列不为 NULL 的行
    """
    from sqlalchemy import text

    async with async_session_maker() as db:
        # 迁移 translation_status → task_translation_status
        result = await db.execute(text("""
            UPDATE entries SET task_translation_status = CASE
                WHEN translation_status = 'translating' THEN 'running'
                ELSE translation_status
            END
            WHERE task_translation_status IS NULL AND translation_status IS NOT NULL
        """))
        if result.rowcount > 0:
            print(f"Migration: migrated {result.rowcount} entries translation_status -> task_translation_status")

        # 迁移 ai_content_type → task_interpret_status
        result = await db.execute(text("""
            UPDATE entries SET task_interpret_status = CASE
                WHEN ai_content_type = 'interpreting' THEN 'running'
                WHEN ai_content_type = 'arxiv_interpretation' THEN 'completed'
                WHEN ai_content_type = 'error' THEN 'failed'
                WHEN ai_content_type = 'no_html' THEN 'skipped'
                ELSE ai_content_type
            END
            WHERE task_interpret_status IS NULL AND ai_content_type IS NOT NULL
        """))
        if result.rowcount > 0:
            print(f"Migration: migrated {result.rowcount} entries ai_content_type -> task_interpret_status")

        await db.commit()


async def close_db() -> None:
    """关闭数据库连接"""
    await engine.dispose()
