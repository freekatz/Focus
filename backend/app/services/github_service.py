"""
GitHub 代码仓库分析服务

功能：
1. 从 GitHub 仓库获取 README 和关键文档内容
2. 使用 AI 分析仓库的技术能力
3. 特别关注相机轨迹生成和相机控制能力
"""
import re
from typing import Optional
from urllib.parse import urlparse

import httpx
from openai import AsyncOpenAI

from app.models.user_config import UserConfig
from app.agents.github_prompts import (
    GITHUB_ANALYSIS_SYSTEM_PROMPT,
    GITHUB_ANALYSIS_USER_PROMPT,
    GITHUB_BATCH_COMPARISON_PROMPT,
)
from app.services.ai_executor import (
    create_executor_for_interpret,
    AIModelExecutor,
)
from app.utils.logger import logger

# API 请求超时配置（秒）
API_TIMEOUT = 120.0
# GitHub raw 内容请求超时
GITHUB_FETCH_TIMEOUT = 30.0
# README 内容最大长度（字符），避免 token 超限
MAX_CONTENT_LENGTH = 20000


def parse_github_url(url: str) -> Optional[tuple[str, str]]:
    """
    解析 GitHub 仓库 URL，提取 owner 和 repo

    Args:
        url: GitHub 仓库 URL，如 https://github.com/owner/repo

    Returns:
        (owner, repo) 元组，如果解析失败返回 None
    """
    url = url.strip().rstrip('/')
    # 匹配 https://github.com/owner/repo 格式
    patterns = [
        r'github\.com/([^/]+)/([^/\s?#]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            owner = match.group(1)
            repo = match.group(2)
            # 去除 .git 后缀
            repo = repo.removesuffix('.git')
            return owner, repo
    return None


async def fetch_github_readme(owner: str, repo: str) -> Optional[str]:
    """
    从 GitHub 获取仓库 README 内容

    优先获取 README.md，失败时尝试 README

    Args:
        owner: 仓库所有者
        repo: 仓库名称

    Returns:
        README 内容字符串，获取失败返回 None
    """
    headers = {
        "User-Agent": "Focus-App/1.0",
        "Accept": "application/vnd.github.raw",
    }

    # 按优先级尝试不同的 README 文件名
    readme_candidates = [
        "README.md",
        "readme.md",
        "README.MD",
        "README",
        "README.rst",
        "README.txt",
    ]

    raw_base = f"https://raw.githubusercontent.com/{owner}/{repo}/main"
    raw_base_master = f"https://raw.githubusercontent.com/{owner}/{repo}/master"

    async with httpx.AsyncClient(timeout=GITHUB_FETCH_TIMEOUT) as client:
        for filename in readme_candidates:
            for base_url in [raw_base, raw_base_master]:
                try:
                    response = await client.get(
                        f"{base_url}/{filename}",
                        headers=headers,
                        follow_redirects=True,
                    )
                    if response.status_code == 200:
                        content = response.text
                        logger.info(
                            f"[GitHub Service] Fetched {filename} from {owner}/{repo} "
                            f"({len(content)} chars)"
                        )
                        return content
                except httpx.HTTPError:
                    continue

    logger.warning(f"[GitHub Service] Could not fetch README for {owner}/{repo}")
    return None


async def fetch_github_repo_info(owner: str, repo: str) -> dict:
    """
    从 GitHub API 获取仓库基本信息

    Args:
        owner: 仓库所有者
        repo: 仓库名称

    Returns:
        仓库信息字典（description, topics, etc.）
    """
    headers = {
        "User-Agent": "Focus-App/1.0",
        "Accept": "application/vnd.github.v3+json",
    }
    api_url = f"https://api.github.com/repos/{owner}/{repo}"

    try:
        async with httpx.AsyncClient(timeout=GITHUB_FETCH_TIMEOUT) as client:
            response = await client.get(api_url, headers=headers, follow_redirects=True)
            if response.status_code == 200:
                data = response.json()
                return {
                    "description": data.get("description", ""),
                    "topics": data.get("topics", []),
                    "stars": data.get("stargazers_count", 0),
                    "language": data.get("language", ""),
                    "full_name": data.get("full_name", f"{owner}/{repo}"),
                }
    except (httpx.HTTPError, Exception) as e:
        logger.warning(f"[GitHub Service] Failed to fetch repo info for {owner}/{repo}: {e}")

    return {
        "description": "",
        "topics": [],
        "stars": 0,
        "language": "",
        "full_name": f"{owner}/{repo}",
    }


def truncate_content(content: str, max_length: int = MAX_CONTENT_LENGTH) -> str:
    """截断内容到最大长度，保留关键信息"""
    if len(content) <= max_length:
        return content

    # 尝试在段落边界截断
    truncated = content[:max_length]
    last_newline = truncated.rfind('\n\n')
    if last_newline > max_length * 0.8:
        truncated = truncated[:last_newline]

    return truncated + f"\n\n[... 内容已截断，原始长度 {len(content)} 字符 ...]"


class GitHubRepoAnalyzer:
    """GitHub 仓库分析器 - 分析仓库的技术能力"""

    def __init__(self, config: UserConfig):
        """
        初始化分析器

        Args:
            config: 用户配置（用于 AI 模型配置）
        """
        self.config = config
        self.executor = create_executor_for_interpret(config)

        # 如果没有配置解读模型，回退到旧配置
        if not self.executor:
            ai_api_key = getattr(config, 'ai_api_key', None)
            ai_base_url = getattr(config, 'ai_base_url', None)
            ai_model = getattr(config, 'ai_model', 'gpt-4o-mini')
            if ai_api_key:
                self.client = AsyncOpenAI(
                    api_key=ai_api_key,
                    base_url=ai_base_url if ai_base_url else None,
                    timeout=API_TIMEOUT,
                )
                self.model = ai_model
            else:
                self.client = None
                self.model = None

    async def analyze_repository(self, url: str) -> dict:
        """
        分析单个 GitHub 仓库的技术能力

        Args:
            url: GitHub 仓库 URL

        Returns:
            包含分析结果的字典：
            {
                "url": str,
                "name": str,
                "description": str,
                "stars": int,
                "readme_available": bool,
                "analysis": str,  # Markdown 格式的分析结果
                "error": str | None,
            }
        """
        # 解析 URL
        parsed = parse_github_url(url)
        if not parsed:
            return {
                "url": url,
                "name": url,
                "description": "",
                "stars": 0,
                "readme_available": False,
                "analysis": "",
                "error": f"无法解析 GitHub URL: {url}",
            }

        owner, repo = parsed
        repo_name = f"{owner}/{repo}"

        logger.info(f"[GitHub Analyzer] Analyzing repository: {repo_name}")

        # 并发获取仓库信息和 README
        import asyncio
        repo_info_task = asyncio.create_task(fetch_github_repo_info(owner, repo))
        readme_task = asyncio.create_task(fetch_github_readme(owner, repo))

        repo_info = await repo_info_task
        readme_content = await readme_task

        if not readme_content:
            return {
                "url": url,
                "name": repo_info.get("full_name", repo_name),
                "description": repo_info.get("description", ""),
                "stars": repo_info.get("stars", 0),
                "readme_available": False,
                "analysis": "",
                "error": f"无法获取仓库 {repo_name} 的 README 内容，请检查仓库是否公开可访问。",
            }

        # 构建分析内容
        content_parts = []

        # 添加仓库基本信息
        if repo_info.get("description"):
            content_parts.append(f"**仓库描述**: {repo_info['description']}")
        if repo_info.get("topics"):
            content_parts.append(f"**话题标签**: {', '.join(repo_info['topics'])}")
        if repo_info.get("language"):
            content_parts.append(f"**主要语言**: {repo_info['language']}")

        # 添加 README 内容（截断以控制 token 用量）
        content_parts.append("\n---\n")
        content_parts.append("**README 内容**:")
        content_parts.append(truncate_content(readme_content))

        full_content = "\n".join(content_parts)

        # 使用 AI 分析
        try:
            analysis = await self._run_analysis(url, repo_info.get("full_name", repo_name), full_content)
            return {
                "url": url,
                "name": repo_info.get("full_name", repo_name),
                "description": repo_info.get("description", ""),
                "stars": repo_info.get("stars", 0),
                "readme_available": True,
                "analysis": analysis,
                "error": None,
            }
        except Exception as e:
            logger.error(f"[GitHub Analyzer] AI analysis failed for {repo_name}: {e}")
            return {
                "url": url,
                "name": repo_info.get("full_name", repo_name),
                "description": repo_info.get("description", ""),
                "stars": repo_info.get("stars", 0),
                "readme_available": True,
                "analysis": "",
                "error": f"AI 分析失败: {str(e)}",
            }

    async def _run_analysis(self, url: str, name: str, content: str) -> str:
        """运行 AI 分析任务"""
        user_prompt = GITHUB_ANALYSIS_USER_PROMPT.format(
            url=url,
            name=name,
            content=content,
        )

        async def _analysis_task(client: AsyncOpenAI, model: str) -> str:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": GITHUB_ANALYSIS_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
            )
            return response.choices[0].message.content

        if self.executor:
            return await self.executor.execute(_analysis_task, "GitHub Repo Analyzer")
        elif self.client:
            return await _analysis_task(self.client, self.model)
        else:
            raise RuntimeError("未配置 AI 模型，请先在设置中配置 AI API Key")

    async def analyze_repositories_batch(self, urls: list[str]) -> dict:
        """
        批量分析多个 GitHub 仓库并生成对比报告

        Args:
            urls: GitHub 仓库 URL 列表

        Returns:
            包含各仓库分析和综合对比的字典
        """
        import asyncio

        # 并发分析所有仓库
        tasks = [self.analyze_repository(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        analyses = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                analyses.append({
                    "url": urls[i],
                    "name": urls[i],
                    "description": "",
                    "stars": 0,
                    "readme_available": False,
                    "analysis": "",
                    "error": str(result),
                })
            else:
                analyses.append(result)

        return {
            "analyses": analyses,
            "total": len(analyses),
            "successful": sum(1 for a in analyses if not a.get("error")),
        }
