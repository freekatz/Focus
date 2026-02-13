"""
RSS 采集定时任务
"""
import asyncio
from datetime import datetime
from typing import Optional

from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload

from app.database import async_session_maker
from app.models.rss import RssSource
from app.models.entry import Entry, TaskStatus
from app.models.user import User
from app.services.rss_service import fetch_rss_entries
from app.services.arxiv_service import is_arxiv_entry, ArxivInterpreter
from app.utils.logger import logger


async def fetch_all_rss_task():
    """
    定时任务：采集所有活跃的 RSS 源

    注意：ArXiv 文章的解读不在抓取时触发，而是在用户保存文章时触发。
    ArXiv 文章的摘要翻译会在抓取时自动进行（如果开启了自动翻译）。
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

                # ArXiv 文章摘要翻译（如果开启了自动翻译）
                if new > 0:
                    await trigger_arxiv_translation(db, source.id)

            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to fetch RSS '{source.name}': {e}")

        logger.info(
            f"RSS fetch task completed: "
            f"{success_count} success, {failed_count} failed, "
            f"{total_fetched} total entries, {total_new} new entries"
        )


async def fetch_single_source_task(source_id: int):
    """
    定时任务：采集单个 RSS 源

    Args:
        source_id: RSS 源 ID
    """
    logger.info(f"Starting RSS fetch task for source {source_id}...")

    async with async_session_maker() as db:
        result = await db.execute(
            select(RssSource).where(RssSource.id == source_id, RssSource.is_active == True)
        )
        source = result.scalar_one_or_none()

        if not source:
            logger.warning(f"RSS source {source_id} not found or not active")
            return

        try:
            fetched, new = await fetch_rss_entries(db, source)
            logger.info(f"Fetched RSS '{source.name}': {fetched} entries, {new} new")

            # ArXiv 文章摘要翻译（如果开启了自动翻译）
            if new > 0:
                await trigger_arxiv_translation(db, source_id)

        except Exception as e:
            logger.error(f"Failed to fetch RSS '{source.name}': {e}")


async def trigger_arxiv_translation(db, source_id: int):
    """
    触发 ArXiv 文章的摘要翻译

    查找该源下所有未翻译的 ArXiv 文章，创建后台任务进行翻译

    Args:
        db: 数据库会话
        source_id: RSS 源 ID
    """
    from app.services.arxiv_service import is_arxiv_entry

    # 获取用户配置，检查是否开启自动翻译
    user_result = await db.execute(select(User).limit(1))
    user = user_result.scalar_one_or_none()

    if not user or not user.config:
        return

    config = user.config

    # 检查是否开启自动翻译（优先从统一配置读取，回退到旧字段）
    from app.services.ai_executor import is_task_enabled
    ai_models_json = getattr(config, 'ai_models', None)
    auto_translate = is_task_enabled(ai_models_json, "translation") if ai_models_json else getattr(config, 'auto_translate_abstract', True)
    if not auto_translate:
        logger.info("Auto translate is disabled, skipping ArXiv translation")
        return

    # 检查是否配置了 AI
    if not config.ai_api_key:
        logger.warning("No AI API key configured, skipping ArXiv translation")
        return

    # 查找该源下待翻译的 ArXiv 文章（pending 或未设置状态且未翻译）
    from sqlalchemy import or_

    result = await db.execute(
        select(Entry).where(
            Entry.rss_source_id == source_id,
            Entry.translated_abstract.is_(None),  # 未翻译
            or_(
                Entry.task_translation_status.is_(None),
                Entry.task_translation_status == TaskStatus.PENDING.value,
                Entry.task_translation_status == TaskStatus.FAILED.value,  # 重试失败的
            )
        )
    )
    entries = list(result.scalars().all())

    arxiv_entries = [e for e in entries if is_arxiv_entry(e)]

    if not arxiv_entries:
        return

    # 标记为待翻译状态
    for entry in arxiv_entries:
        if not entry.task_translation_status:
            entry.task_translation_status = TaskStatus.PENDING.value
    await db.commit()

    logger.info(f"Found {len(arxiv_entries)} ArXiv entries to translate for source {source_id}")

    # 并发翻译（限制并发数）
    asyncio.create_task(batch_translate_abstracts(arxiv_entries, config))


async def batch_translate_abstracts(entries: list, config):
    """
    批量翻译 ArXiv 文章摘要

    使用信号量限制并发数，避免 API 限流

    Args:
        entries: 需要翻译的文章列表
        config: 用户配置
    """
    from app.services.arxiv_service import ArxivTranslator

    # 限制并发数为 5
    semaphore = asyncio.Semaphore(5)

    async def translate_one(entry):
        async with semaphore:
            await translate_abstract(entry.id, config)

    # 并发执行翻译
    await asyncio.gather(*[translate_one(e) for e in entries], return_exceptions=True)


async def translate_abstract(entry_id: int, config=None):
    """
    翻译单篇 ArXiv 文章的摘要（一次调用同时生成翻译和总结）

    Args:
        entry_id: 文章 ID
        config: 用户配置（可选，如果不传则从数据库获取）
    """
    from app.services.arxiv_service import ArxivTranslator

    async with async_session_maker() as db:
        result = await db.execute(select(Entry).where(Entry.id == entry_id))
        entry = result.scalar_one_or_none()

        if not entry:
            logger.info(f"Entry {entry_id} not found (may have been deleted), skipping translation")
            return

        # 跳过已完成的文章
        has_translation = entry.translated_abstract and entry.translated_abstract.strip()
        has_summary = entry.brief_summary and entry.brief_summary.strip()
        if has_translation and has_summary:
            return

        if not config:
            user_result = await db.execute(select(User).limit(1))
            user = user_result.scalar_one_or_none()
            if not user or not user.config:
                logger.warning("No user config found for translation")
                return
            config = user.config

        if not config.ai_api_key:
            logger.warning("No AI API key configured, skipping translation")
            return

        try:
            entry.task_translation_status = TaskStatus.RUNNING.value
            await db.commit()

            logger.info(f"Translating entry {entry_id} using model '{config.ai_model}': '{entry.title[:50]}...'")

            translator = ArxivTranslator(config)
            translated, brief_summary = await translator.translate_and_summarize(
                entry.content or "",
                entry.title
            )

            entry.translated_abstract = translated
            entry.brief_summary = brief_summary
            entry.task_translation_status = TaskStatus.COMPLETED.value
            await db.commit()

            logger.info(f"Completed translation for entry {entry_id}")

        except Exception as e:
            logger.error(f"Failed to translate entry {entry_id}: {e}")
            entry.task_translation_status = TaskStatus.FAILED.value
            await db.commit()


async def scan_pending_arxiv_tasks():
    """
    启动时扫描未完成的 ArXiv 翻译和解读任务

    扫描并处理：
    1. 未翻译的 ArXiv 文章（task_translation_status 为 pending/failed/running）
    2. 已翻译但缺少简要总结的 ArXiv 文章
    3. 已保存但未解读的 ArXiv 文章（status=interested 且 task_interpret_status 为空或 running）
    """
    from app.models.entry import EntryStatus
    from app.services.arxiv_service import is_arxiv_entry, validate_ai_api_key
    from app.services.ai_executor import is_task_enabled

    logger.info("Scanning for pending ArXiv translation and interpretation tasks...")

    async with async_session_maker() as db:
        # 获取用户配置
        user_result = await db.execute(select(User).limit(1))
        user = user_result.scalar_one_or_none()

        if not user or not user.config:
            logger.info("No user config found, skipping ArXiv task scan")
            return

        config = user.config

        if not config.ai_api_key:
            logger.info("No AI API key configured, skipping ArXiv task scan")
            return

        # 验证 API Key
        logger.info("Validating AI API Key...")
        validation = await validate_ai_api_key(
            api_key=config.ai_api_key,
            base_url=config.ai_base_url,
            model=config.ai_model,
        )
        if not validation["valid"]:
            logger.error(f"AI API Key validation failed: {validation['error']}")
            logger.info("Skipping ArXiv tasks due to invalid API Key")
            return
        logger.info(f"AI API Key validated successfully, model: {validation['model']}")

        # 1. 扫描未翻译或翻译不完整的 ArXiv 文章
        # 注意：需要同时检查 NULL 和空字符串，因为某些情况下会存储空字符串
        # 使用 selectinload 预加载 rss_source 关系，避免延迟加载导致的 greenlet 错误
        translation_result = await db.execute(
            select(Entry)
            .options(selectinload(Entry.rss_source))
            .where(
                or_(
                    Entry.task_translation_status.is_(None),
                    Entry.task_translation_status == TaskStatus.PENDING.value,
                    Entry.task_translation_status == TaskStatus.FAILED.value,
                    Entry.task_translation_status == TaskStatus.RUNNING.value,  # 可能因重启而中断
                    Entry.task_translation_status == TaskStatus.COMPLETED.value,  # 已完成但可能内容为空
                )
            )
        )
        all_entries = list(translation_result.scalars().all())

        # 筛选需要处理的 ArXiv 文章：
        # 1. 翻译为空（NULL 或空字符串）
        # 2. 翻译存在但总结为空
        def needs_translation(entry: Entry) -> bool:
            if not is_arxiv_entry(entry):
                return False
            trans = entry.translated_abstract
            summary = entry.brief_summary
            # 翻译为空或空字符串
            if not trans or trans.strip() == "":
                return True
            # 翻译存在但总结为空或空字符串
            if not summary or summary.strip() == "":
                return True
            return False

        untranslated = [e for e in all_entries if needs_translation(e)]

        if untranslated:
            logger.info(f"Found {len(untranslated)} untranslated ArXiv entries, starting translation...")
            # 标记为待翻译
            for entry in untranslated:
                entry.task_translation_status = TaskStatus.PENDING.value
            await db.commit()
            # 启动后台翻译任务
            asyncio.create_task(batch_translate_abstracts(untranslated, config))

        # 2. 扫描已保存但未解读的 ArXiv 文章（包括解读失败需要重试的）
        # 检查是否开启自动解读（优先从统一配置读取，回退到旧字段）
        ai_models_json = getattr(config, 'ai_models', None)
        auto_interpret = is_task_enabled(ai_models_json, "interpret") if ai_models_json else getattr(config, 'auto_interpret_arxiv', True)
        if not auto_interpret:
            logger.info("Auto ArXiv interpretation disabled, skipping interpretation scan")
            uninterpreted = []
        else:
            # 注意：skipped 状态不在此列表中，因为没有 HTML 版本的论文无法解读
            interpretation_result = await db.execute(
                select(Entry)
                .options(selectinload(Entry.rss_source))
                .where(
                    Entry.status == EntryStatus.INTERESTED,
                    or_(
                        # 未解读：task_interpret_status 为空
                        Entry.task_interpret_status.is_(None),
                        # 解读中断：因重启而停在 running 状态
                        Entry.task_interpret_status == TaskStatus.RUNNING.value,
                        # 解读失败：failed 状态，需要重试（不包括 skipped）
                        Entry.task_interpret_status == TaskStatus.FAILED.value,
                    )
                )
            )
            saved_entries = list(interpretation_result.scalars().all())
            uninterpreted = [e for e in saved_entries if is_arxiv_entry(e)]

            if uninterpreted:
                logger.info(f"Found {len(uninterpreted)} saved but uninterpreted ArXiv entries, starting interpretation...")
                # 重置状态并逐个启动解读任务
                for entry in uninterpreted:
                    # 重置解读相关字段，确保重新开始
                    entry.ai_summary = None
                    entry.task_interpret_status = None
                    entry.ai_processed_at = None
                await db.commit()

                # 逐个启动解读任务（解读较重，不并发太多）
                for entry in uninterpreted:
                    asyncio.create_task(interpret_arxiv_entry(entry.id))

        if not untranslated and not uninterpreted:
            logger.info("No pending ArXiv tasks found")


async def interpret_arxiv_entry(entry_id: int):
    """
    后台解读 ArXiv 文章

    注意：此函数现在在用户保存文章时调用，而不是在抓取时调用

    Args:
        entry_id: 文章 ID
    """
    from app.services.arxiv_service import ArxivInterpreter, NoHtmlAvailableError

    async with async_session_maker() as db:
        # 获取文章
        result = await db.execute(
            select(Entry).where(Entry.id == entry_id)
        )
        entry = result.scalar_one_or_none()

        if not entry:
            logger.info(f"Entry {entry_id} not found (may have been deleted), skipping interpretation")
            return

        # 跳过已成功解读的文章
        if entry.task_interpret_status == TaskStatus.COMPLETED.value and entry.ai_summary:
            logger.info(f"Entry {entry_id} already interpreted, skipping")
            return

        # 跳过正在解读中的文章（但如果是从启动扫描来的 running 状态，需要继续）
        # 这里不跳过 running 状态，因为可能是重启后恢复的任务

        # 获取用户配置（使用默认用户）
        user_result = await db.execute(select(User).limit(1))
        user = user_result.scalar_one_or_none()

        if not user or not user.config:
            logger.warning("No user config found for ArXiv interpretation")
            return

        config = user.config

        # 检查是否配置了 AI
        if not config.ai_api_key:
            logger.warning("No AI API key configured, skipping ArXiv interpretation")
            return

        try:
            # 更新状态：解读中
            entry.task_interpret_status = TaskStatus.RUNNING.value
            await db.commit()

            logger.info(f"Starting interpretation for entry {entry_id}: '{entry.title[:50]}...'")

            # 执行解读
            interpreter = ArxivInterpreter(config)
            interpretation = await interpreter.interpret(entry)

            # 保存结果到数据库
            entry.ai_summary = interpretation
            entry.task_interpret_status = TaskStatus.COMPLETED.value
            entry.ai_processed_at = datetime.utcnow()
            await db.commit()

            logger.info(f"Completed interpretation for entry {entry_id}")

        except NoHtmlAvailableError as e:
            logger.info(f"Entry {entry_id} has no HTML version: {e}")
            entry.task_interpret_status = TaskStatus.SKIPPED.value
            entry.ai_summary = None  # 不保存错误信息，前端显示翻译内容
            await db.commit()

        except Exception as e:
            error_msg = str(e)
            # 解析常见 AI API 错误
            if "404" in error_msg:
                logger.error(f"Failed to interpret entry {entry_id}: Model '{config.ai_model}' not found. "
                           f"Base URL: {config.ai_base_url or 'default'}. Please check AI settings.")
                entry.ai_summary = f"解读失败: 模型 '{config.ai_model}' 不存在，请检查 AI 设置"
            elif "401" in error_msg or "Unauthorized" in error_msg:
                logger.error(f"Failed to interpret entry {entry_id}: Invalid API key.")
                entry.ai_summary = "解读失败: API 密钥无效，请检查 AI 设置"
            elif "429" in error_msg or "rate" in error_msg.lower():
                logger.error(f"Failed to interpret entry {entry_id}: Rate limit exceeded.")
                entry.ai_summary = "解读失败: API 请求频率超限，请稍后重试"
            else:
                logger.error(f"Failed to interpret entry {entry_id}: {e}")
                entry.ai_summary = f"解读失败: {error_msg}"
            entry.task_interpret_status = TaskStatus.FAILED.value
            await db.commit()
