"""
RSS 服务 - 处理 RSS 相关业务逻辑
"""
import asyncio
import ssl
import urllib.request
from datetime import datetime
from functools import partial
from typing import Optional, List, Tuple
import feedparser
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rss import RssSource, RssCategory
from app.models.entry import Entry, EntryStatus
from app.schemas.rss import RssSourceCreate, RssSourceUpdate
from app.utils.hash import generate_hash
from app.utils.logger import logger


def parse_feed_safe(url: str, allow_ssl_bypass: bool = True):
    """
    安全地解析 RSS feed

    Args:
        url: RSS 订阅地址
        allow_ssl_bypass: 是否允许在 SSL 验证失败时绕过验证，默认允许

    Returns:
        feedparser 解析结果
    """
    logger.info(f"parse_feed_safe called: url={url}, allow_ssl_bypass={allow_ssl_bypass}")

    # 首先尝试正常解析
    feed = feedparser.parse(url)

    # 检查是否有 SSL 证书验证错误
    if feed.bozo and feed.bozo_exception:
        exception_str = str(feed.bozo_exception)
        logger.info(f"Feed bozo exception: {exception_str}")
        if "CERTIFICATE_VERIFY_FAILED" in exception_str or "SSL" in exception_str.upper():
            if allow_ssl_bypass:
                logger.warning(f"SSL verification failed for {url}, retrying without verification.")
                # SSL 验证失败，使用跳过验证的方式重试
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                handlers = [urllib.request.HTTPSHandler(context=ssl_context)]
                feed = feedparser.parse(url, handlers=handlers)
            else:
                logger.warning(f"SSL verification failed for {url}, bypass not allowed. Feed will fail.")

    return feed

def extract_authors(entry: dict) -> Optional[str]:
    """
    从 feed entry 提取作者信息
    支持: authors 列表 (arXiv等), author_detail, author 字符串
    Returns: 逗号分隔的作者列表，截断至200字符
    """
    authors = []

    # 1. 优先尝试 authors 列表 (arXiv 等学术源常用)
    if entry.get("authors"):
        for author in entry["authors"]:
            if isinstance(author, dict):
                name = author.get("name", "").strip()
                if name:
                    authors.append(name)
            elif isinstance(author, str):
                authors.append(author.strip())

    # 2. 尝试 author_detail
    elif entry.get("author_detail"):
        detail = entry["author_detail"]
        if isinstance(detail, dict):
            name = detail.get("name", "").strip()
            if name:
                authors.append(name)

    # 3. 尝试 author 字符串
    elif entry.get("author"):
        author = entry["author"]
        if isinstance(author, str):
            # 处理逗号/分号/and 分隔的多作者
            author = author.replace(" and ", ", ").replace(";", ",")
            for a in author.split(","):
                a = a.strip()
                if a:
                    authors.append(a)

    if not authors:
        return None

    # 拼接并截断到 200 字符
    result = ", ".join(authors)
    if len(result) > 200:
        # 智能截断：在最后一个逗号处截断
        result = result[:197]
        last_comma = result.rfind(",")
        if last_comma > 100:
            result = result[:last_comma] + "..."
        else:
            result = result[:197] + "..."

    return result


async def get_rss_sources(
    db: AsyncSession,
    category: Optional[RssCategory] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[RssSource], int]:
    """获取 RSS 源列表"""
    query = select(RssSource)

    if category:
        query = query.where(RssSource.category == category)
    if is_active is not None:
        query = query.where(RssSource.is_active == is_active)

    # 获取总数
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # 获取列表
    query = query.order_by(RssSource.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


async def get_rss_source_by_id(db: AsyncSession, rss_id: int) -> Optional[RssSource]:
    """根据 ID 获取 RSS 源"""
    result = await db.execute(select(RssSource).where(RssSource.id == rss_id))
    return result.scalar_one_or_none()


async def get_rss_source_by_url_hash(db: AsyncSession, url_hash: str) -> Optional[RssSource]:
    """根据 URL 哈希获取 RSS 源"""
    result = await db.execute(select(RssSource).where(RssSource.url_hash == url_hash))
    return result.scalar_one_or_none()


async def create_rss_source(db: AsyncSession, data: RssSourceCreate) -> RssSource:
    """创建 RSS 源"""
    logger.info(f"Creating RSS source: {data.name}, url={data.url}, allow_ssl_bypass={data.allow_ssl_bypass}")
    url_hash = generate_hash(data.url)

    # 检查是否已存在
    existing = await get_rss_source_by_url_hash(db, url_hash)
    if existing:
        raise ValueError(f"RSS source with URL already exists: {data.url}")

    rss_source = RssSource(
        name=data.name,
        url=data.url,
        website_url=data.website_url,
        description=data.description,
        category=data.category,
        fetch_interval=data.fetch_interval,
        allow_ssl_bypass=data.allow_ssl_bypass,
        url_hash=url_hash,
    )
    db.add(rss_source)
    await db.commit()
    await db.refresh(rss_source)
    return rss_source


async def update_rss_source(
    db: AsyncSession, rss_source: RssSource, data: RssSourceUpdate
) -> RssSource:
    """更新 RSS 源"""
    update_data = data.model_dump(exclude_unset=True)
    logger.info(f"Updating RSS source {rss_source.id}: {update_data}")

    # 如果更新了 URL，需要重新计算哈希
    if "url" in update_data:
        new_url_hash = generate_hash(update_data["url"])
        existing = await get_rss_source_by_url_hash(db, new_url_hash)
        if existing and existing.id != rss_source.id:
            raise ValueError(f"RSS source with URL already exists: {update_data['url']}")
        update_data["url_hash"] = new_url_hash

    # 如果更新了名称，同步更新所有关联条目的 rss_source_name
    if "name" in update_data and update_data["name"] != rss_source.name:
        await db.execute(
            update(Entry)
            .where(Entry.rss_source_id == rss_source.id)
            .values(rss_source_name=update_data["name"])
        )
        logger.info(f"Updated rss_source_name for entries of source {rss_source.id}: {rss_source.name} -> {update_data['name']}")

    for field, value in update_data.items():
        setattr(rss_source, field, value)

    rss_source.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(rss_source)
    return rss_source


async def delete_rss_source(db: AsyncSession, rss_source: RssSource) -> dict:
    """
    删除 RSS 源

    删除策略：
    - 已收藏(favorite)和感兴趣(interested)的条目：保留，设置 rss_source_id 为 NULL
    - 其他状态的条目（unread, trash, archived）：删除

    Returns:
        dict: 包含删除统计信息
    """
    source_name = rss_source.name
    source_id = rss_source.id

    # 1. 更新需要保留的条目：设置 rss_source_name 并将 rss_source_id 设为 NULL
    # 保留的状态：favorite, interested
    preserved_statuses = [EntryStatus.FAVORITE, EntryStatus.INTERESTED]

    # 先更新 rss_source_name（如果还没有的话）
    await db.execute(
        update(Entry)
        .where(
            Entry.rss_source_id == source_id,
            Entry.status.in_(preserved_statuses)
        )
        .values(
            rss_source_name=source_name,
            rss_source_id=None
        )
    )

    # 统计保留的条目数
    preserved_result = await db.execute(
        select(func.count(Entry.id))
        .where(
            Entry.rss_source_name == source_name,
            Entry.rss_source_id.is_(None),
            Entry.status.in_(preserved_statuses)
        )
    )
    preserved_count = preserved_result.scalar() or 0

    # 2. 删除其他状态的条目
    deleted_result = await db.execute(
        select(func.count(Entry.id))
        .where(Entry.rss_source_id == source_id)
    )
    deleted_count = deleted_result.scalar() or 0

    # 执行删除
    from sqlalchemy import delete as sql_delete
    await db.execute(
        sql_delete(Entry).where(Entry.rss_source_id == source_id)
    )

    # 3. 删除 RSS 源本身
    await db.delete(rss_source)
    await db.commit()

    logger.info(
        f"Deleted RSS source '{source_name}': "
        f"{deleted_count} entries deleted, {preserved_count} entries preserved"
    )

    return {
        "source_name": source_name,
        "deleted_entries": deleted_count,
        "preserved_entries": preserved_count
    }


async def validate_rss_url(url: str, allow_ssl_bypass: bool = True) -> dict:
    """验证 RSS URL 是否有效"""
    logger.info(f"Validating RSS URL: {url}, allow_ssl_bypass={allow_ssl_bypass}")
    try:
        # 在线程池中运行同步的 feedparser，避免阻塞事件循环
        # 使用 parse_feed_safe 处理 SSL 证书验证问题
        feed = await asyncio.to_thread(parse_feed_safe, url, allow_ssl_bypass)

        if feed.bozo and not feed.entries:
            return {
                "valid": False,
                "error": str(feed.bozo_exception) if feed.bozo_exception else "Invalid RSS feed",
            }

        return {
            "valid": True,
            "title": feed.feed.get("title"),
            "description": feed.feed.get("description"),
            "link": feed.feed.get("link"),
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}


async def fetch_rss_entries(db: AsyncSession, rss_source: RssSource) -> Tuple[int, int]:
    """
    采集 RSS 源的条目

    去重策略：
    1. 同一 RSS 源内通过 content_hash 去重
    2. 对于孤立条目（rss_source_id 为 NULL 的已保留文章），
       通过 content_hash 匹配并重新关联到当前源，避免重复

    Returns:
        (fetched_count, new_count): 采集总数和新增数量
    """
    try:
        # 在线程池中运行同步的 feedparser，避免阻塞事件循环
        # 使用 parse_feed_safe 处理 SSL 证书验证问题，根据源配置决定是否允许绕过 SSL
        feed = await asyncio.to_thread(
            parse_feed_safe, rss_source.url, rss_source.allow_ssl_bypass
        )

        if feed.bozo and not feed.entries:
            rss_source.last_fetch_status = "failed"
            rss_source.last_fetch_error = str(feed.bozo_exception) if feed.bozo_exception else "Parse error"
            rss_source.last_fetched_at = datetime.utcnow()
            await db.commit()
            return 0, 0

        fetched_count = len(feed.entries)
        new_count = 0
        reassociated_count = 0

        for entry in feed.entries:
            # 生成内容哈希用于去重
            link = entry.get("link", "")
            title = entry.get("title", "")
            content_hash = generate_hash(link, title)

            # 检查是否已存在于当前源
            existing_in_source = await db.execute(
                select(Entry).where(
                    Entry.rss_source_id == rss_source.id,
                    Entry.content_hash == content_hash,
                )
            )
            if existing_in_source.scalar_one_or_none():
                continue

            # 检查是否存在孤立条目（之前被保留的文章）
            # 使用 first() 而不是 scalar_one_or_none()，因为可能存在多个相同 hash 的孤立条目
            orphan_result = await db.execute(
                select(Entry).where(
                    Entry.rss_source_id.is_(None),
                    Entry.content_hash == content_hash,
                ).limit(1)
            )
            orphan_entry = orphan_result.scalar_one_or_none()

            if orphan_entry:
                # 重新关联孤立条目到当前源
                orphan_entry.rss_source_id = rss_source.id
                orphan_entry.rss_source_name = rss_source.name
                reassociated_count += 1
                continue

            # 解析发布时间
            published_at = None
            if entry.get("published_parsed"):
                published_at = datetime(*entry.published_parsed[:6])

            # 获取内容
            content = ""
            if entry.get("content"):
                content = entry.content[0].get("value", "")
            elif entry.get("summary"):
                content = entry.summary
            elif entry.get("description"):
                content = entry.description

            # 创建条目
            new_entry = Entry(
                rss_source_id=rss_source.id,
                rss_source_name=rss_source.name,  # 保存源名称快照
                title=title,
                link=link,
                author=extract_authors(entry),  # 增强多作者提取
                published_at=published_at,
                content=content,
                content_hash=content_hash,
                guid=entry.get("id"),
            )
            db.add(new_entry)
            new_count += 1

        # 更新 RSS 源状态
        rss_source.last_fetched_at = datetime.utcnow()
        rss_source.last_fetch_status = "success"
        rss_source.last_fetch_error = None
        rss_source.fetch_count += 1
        rss_source.entry_count += new_count + reassociated_count
        rss_source.unread_count += new_count  # 重新关联的保持原状态，不计入 unread

        await db.commit()
        if reassociated_count > 0:
            logger.info(
                f"Fetched RSS '{rss_source.name}': {fetched_count} entries, "
                f"{new_count} new, {reassociated_count} reassociated"
            )
        else:
            logger.info(f"Fetched RSS '{rss_source.name}': {fetched_count} entries, {new_count} new")
        return fetched_count, new_count

    except Exception as e:
        rss_source.last_fetch_status = "failed"
        rss_source.last_fetch_error = str(e)
        rss_source.last_fetched_at = datetime.utcnow()
        await db.commit()
        logger.error(f"Failed to fetch RSS '{rss_source.name}': {e}")
        return 0, 0


async def get_rss_stats(db: AsyncSession) -> dict:
    """获取 RSS 统计信息"""
    # 总数和激活数
    total = (await db.execute(select(func.count(RssSource.id)))).scalar() or 0
    active = (
        await db.execute(
            select(func.count(RssSource.id)).where(RssSource.is_active == True)
        )
    ).scalar() or 0

    # 按分类统计
    category_result = await db.execute(
        select(RssSource.category, func.count(RssSource.id)).group_by(RssSource.category)
    )
    by_category = {row[0].value: row[1] for row in category_result}

    # 条目统计
    total_entries = (await db.execute(select(func.sum(RssSource.entry_count)))).scalar() or 0
    total_unread = (await db.execute(select(func.sum(RssSource.unread_count)))).scalar() or 0

    return {
        "total": total,
        "active": active,
        "by_category": by_category,
        "total_entries": total_entries,
        "total_unread": total_unread,
    }
