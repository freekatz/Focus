"""
GitHub 仓库分析 API
"""
from typing import List

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select

from app.api.deps import DbSession, CurrentUser
from app.models.user_config import UserConfig
from app.services.github_service import GitHubRepoAnalyzer, parse_github_url

router = APIRouter()


class GitHubAnalyzeRequest(BaseModel):
    """单个仓库分析请求"""
    url: str

    @field_validator('url')
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("URL 不能为空")
        if not parse_github_url(v):
            raise ValueError(f"无效的 GitHub 仓库 URL: {v}")
        return v


class GitHubBatchAnalyzeRequest(BaseModel):
    """批量仓库分析请求"""
    urls: List[str]

    @field_validator('urls')
    @classmethod
    def validate_urls(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("URL 列表不能为空")
        if len(v) > 10:
            raise ValueError("每次最多分析 10 个仓库")
        validated = []
        for url in v:
            url = url.strip()
            if url:
                validated.append(url)
        return validated


class GitHubRepoAnalysisResponse(BaseModel):
    """单个仓库分析响应"""
    url: str
    name: str
    description: str
    stars: int
    readme_available: bool
    analysis: str
    error: str | None = None


class GitHubBatchAnalysisResponse(BaseModel):
    """批量仓库分析响应"""
    analyses: List[GitHubRepoAnalysisResponse]
    total: int
    successful: int


async def get_user_config(db: DbSession, user_id: int) -> UserConfig:
    """获取用户 AI 配置"""
    result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == user_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请先在设置中配置 AI API Key",
        )
    # 检查是否有 AI 配置
    has_ai_config = (
        getattr(config, 'ai_models', None) or
        getattr(config, 'ai_api_key', None)
    )
    if not has_ai_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请先在设置中配置 AI API Key，以启用仓库分析功能",
        )
    return config


@router.post("/analyze", response_model=GitHubRepoAnalysisResponse)
async def analyze_repository(
    data: GitHubAnalyzeRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    分析单个 GitHub 仓库的技术能力

    特别关注：
    - 是否支持从单图生成相机轨迹
    - 是否支持基于相机参数进行控制
    - 是否支持从单图重建/生成4D场景
    - 是否支持从单图生成视频
    """
    config = await get_user_config(db, current_user.id)
    analyzer = GitHubRepoAnalyzer(config)

    result = await analyzer.analyze_repository(data.url)

    return GitHubRepoAnalysisResponse(**result)


@router.post("/analyze/batch", response_model=GitHubBatchAnalysisResponse)
async def analyze_repositories_batch(
    data: GitHubBatchAnalyzeRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """
    批量分析多个 GitHub 仓库并生成对比报告

    特别适用于对比多个4D世界模型仓库的相机控制能力。
    每次最多分析 10 个仓库。
    """
    config = await get_user_config(db, current_user.id)
    analyzer = GitHubRepoAnalyzer(config)

    result = await analyzer.analyze_repositories_batch(data.urls)

    return GitHubBatchAnalysisResponse(
        analyses=[GitHubRepoAnalysisResponse(**a) for a in result["analyses"]],
        total=result["total"],
        successful=result["successful"],
    )
