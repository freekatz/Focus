"""
Zotero 集成 - 使用 pyzotero 库
"""
from typing import Optional, List, Dict
from datetime import datetime

from pyzotero import zotero

from app.models.entry import Entry
from app.utils.logger import logger


# AI content_type 到 Zotero item type 的映射
CONTENT_TYPE_TO_ZOTERO_TYPE = {
    "paper": "journalArticle",      # 学术论文 -> 期刊文章
    "blog": "blogPost",             # 博客 -> 博客文章
    "news": "newspaperArticle",     # 新闻 -> 报纸文章
    "tutorial": "webpage",          # 教程 -> 网页
    "social": "webpage",            # 社交媒体 -> 网页
    "other": "webpage",             # 其他 -> 网页
}


class ZoteroClient:
    """Zotero API 客户端"""

    def __init__(self, library_id: str, library_type: str, api_key: str):
        """
        初始化 Zotero 客户端

        Args:
            library_id: Zotero 库 ID
            library_type: 库类型 ("user" 或 "group")
            api_key: Zotero API Key
        """
        self.library_id = library_id
        self.library_type = library_type
        self.api_key = api_key
        self.client = zotero.Zotero(library_id, library_type, api_key)
        self._collections_cache: Dict[str, str] = {}  # name -> key

    def test_connection(self) -> dict:
        """测试连接"""
        try:
            # 尝试获取库信息
            collections = self.client.collections(limit=1)
            return {"success": True, "message": "Connection successful"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def get_or_create_collection(self, collection_name: str) -> Optional[str]:
        """
        获取或创建 collection，返回 collection key

        Args:
            collection_name: 分类名称

        Returns:
            collection key 或 None
        """
        if not collection_name:
            return None

        # 检查缓存
        if collection_name in self._collections_cache:
            return self._collections_cache[collection_name]

        try:
            # 获取所有 collections
            collections = self.client.collections()
            for col in collections:
                if col["data"]["name"] == collection_name:
                    self._collections_cache[collection_name] = col["key"]
                    return col["key"]

            # 不存在则创建
            new_col = self.client.create_collections([{"name": collection_name}])
            if new_col and "successful" in new_col:
                key = list(new_col["successful"].values())[0]["key"]
                self._collections_cache[collection_name] = key
                logger.info(f"Created Zotero collection: {collection_name} ({key})")
                return key

            return None
        except Exception as e:
            logger.error(f"Failed to get/create collection '{collection_name}': {e}")
            return None

    def _get_zotero_item_type(self, content_type: Optional[str]) -> str:
        """
        根据 AI 识别的内容类型获取对应的 Zotero item type

        Args:
            content_type: AI 识别的内容类型 (paper/blog/news/tutorial/social/other)

        Returns:
            Zotero item type
        """
        if content_type:
            return CONTENT_TYPE_TO_ZOTERO_TYPE.get(content_type.lower(), "webpage")
        return "webpage"

    def create_item(self, entry: Entry, collection_name: Optional[str] = None) -> Optional[str]:
        """
        将文章条目创建为 Zotero 项目，根据内容类型自动选择合适的 item type

        Args:
            entry: 文章条目
            collection_name: 可选的分类名称

        Returns:
            创建成功返回 item key，失败返回 None
        """
        try:
            # 根据 AI 内容类型选择 Zotero item type
            item_type = self._get_zotero_item_type(entry.ai_content_type)
            template = self.client.item_template(item_type)

            # 通用字段
            template["title"] = entry.title
            template["url"] = entry.link
            template["accessDate"] = datetime.utcnow().strftime("%Y-%m-%d")

            # 根据 item type 设置不同字段
            if item_type == "journalArticle":
                # 论文类型
                template["publicationTitle"] = entry.rss_source.name if entry.rss_source else ""
                if entry.author:
                    # 论文作者格式：lastName, firstName
                    template["creators"] = [
                        {"creatorType": "author", "name": entry.author}
                    ]
            elif item_type == "blogPost":
                # 博客类型
                template["blogTitle"] = entry.rss_source.name if entry.rss_source else ""
                if entry.author:
                    template["creators"] = [
                        {"creatorType": "author", "name": entry.author}
                    ]
            elif item_type == "newspaperArticle":
                # 新闻类型
                template["publicationTitle"] = entry.rss_source.name if entry.rss_source else ""
                if entry.author:
                    template["creators"] = [
                        {"creatorType": "author", "name": entry.author}
                    ]
            else:
                # webpage 等其他类型
                template["websiteTitle"] = entry.rss_source.name if entry.rss_source else ""
                if entry.author:
                    template["creators"] = [
                        {"creatorType": "author", "name": entry.author}
                    ]

            # 发布日期
            if entry.published_at:
                template["date"] = entry.published_at.strftime("%Y-%m-%d")

            # 摘要：使用原始内容
            if entry.content:
                # 清理 HTML 标签，截取前 1000 字符作为摘要
                import re
                clean_content = re.sub(r'<[^>]+>', '', entry.content)
                template["abstractNote"] = clean_content[:1000].strip()

            # AI 总结放在「额外」(extra) 字段
            extra_parts = []
            if entry.ai_summary:
                extra_parts.append(f"AI 总结：{entry.ai_summary}")
            if entry.ai_content_type:
                extra_parts.append(f"内容类型：{entry.ai_content_type}")
            if extra_parts:
                template["extra"] = "\n\n".join(extra_parts)

            # 添加标签
            tags = []
            if entry.ai_content_type:
                tags.append({"tag": entry.ai_content_type})
            if entry.rss_source:
                tags.append({"tag": entry.rss_source.name})
            tags.append({"tag": "Focus"})
            template["tags"] = tags

            # 添加到 collection
            if collection_name:
                collection_key = self.get_or_create_collection(collection_name)
                if collection_key:
                    template["collections"] = [collection_key]

            # 创建 item
            response = self.client.create_items([template])

            if response and "successful" in response:
                # 获取创建的 item key
                item_key = list(response["successful"].values())[0]["key"]
                logger.info(f"Created Zotero {item_type}: {item_key} for entry: {entry.title[:50]}")
                return item_key

            logger.error(f"Failed to create Zotero item: {response}")
            return None

        except Exception as e:
            logger.error(f"Zotero API error: {e}")
            return None

    # 保留旧方法名作为别名，保持向后兼容
    def create_web_item(self, entry: Entry, collection_name: Optional[str] = None) -> Optional[str]:
        """向后兼容的别名方法"""
        return self.create_item(entry, collection_name)

    def batch_create_items(self, entries: List[Entry], collection_name: Optional[str] = None) -> dict:
        """
        批量创建 Zotero items

        Args:
            entries: 文章条目列表
            collection_name: 可选的分类名称

        Returns:
            {"success": [...], "failed": [...]}
        """
        results = {"success": [], "failed": []}

        for entry in entries:
            item_key = self.create_web_item(entry, collection_name)
            if item_key:
                results["success"].append({
                    "entry_id": entry.id,
                    "item_key": item_key
                })
            else:
                results["failed"].append({
                    "entry_id": entry.id,
                    "title": entry.title
                })

        return results
