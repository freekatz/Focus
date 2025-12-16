"""
AI 快读 API
"""
from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.api.deps import DbSession, CurrentUser
from app.models.user_config import UserConfig
from app.services import entry_service
from app.agents.prompts import SAGE_HUMAN_PROMPT

router = APIRouter()


class SummarizeResponse(BaseModel):
    """总结响应"""
    summary: str
    content_type: str
    processing_time: float


class PromptResponse(BaseModel):
    """提示词响应"""
    prompt: str
    is_default: bool


class PromptUpdateRequest(BaseModel):
    """更新提示词请求"""
    prompt: str


class TestConnectionResponse(BaseModel):
    """测试连接响应"""
    success: bool
    message: str


@router.post("/test", response_model=TestConnectionResponse)
async def test_ai_connection(db: DbSession, current_user: CurrentUser):
    """测试 AI 连接配置"""
    config_result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == current_user.id)
    )
    config = config_result.scalar_one_or_none()

    if not config or not config.ai_api_key:
        return TestConnectionResponse(success=False, message="AI API key not configured")

    try:
        from app.services.ai_service import AIService

        ai_service = AIService(config)
        # 发送简单测试请求
        response = await ai_service.llm.ainvoke("Say 'OK' if you can hear me.")
        return TestConnectionResponse(success=True, message=f"Connected to {config.ai_provider}")
    except Exception as e:
        return TestConnectionResponse(success=False, message=str(e))


@router.post("/summarize/{entry_id}", response_model=SummarizeResponse)
async def summarize_entry(
    entry_id: int,
    db: DbSession,
    current_user: CurrentUser,
    force_refresh: bool = False,
):
    """生成文章总结"""
    entry = await entry_service.get_entry_by_id(db, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    # 如果已有总结且不强制刷新，直接返回
    if entry.ai_summary and not force_refresh:
        return SummarizeResponse(
            summary=entry.ai_summary,
            content_type=entry.ai_content_type or "unknown",
            processing_time=0.0,
        )

    # 获取用户配置
    config_result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == current_user.id)
    )
    config = config_result.scalar_one_or_none()

    if not config or not config.ai_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AI API key not configured",
        )

    # 调用 AI 服务生成总结
    try:
        from app.services.ai_service import AIService
        from app.utils.logger import logger

        ai_service = AIService(config)
        result = await ai_service.summarize_entry(entry)

        logger.info(f"AI result for entry {entry_id}: {result}")

        # 保存总结结果
        entry.ai_summary = result["summary"]
        entry.ai_content_type = result["content_type"]
        entry.ai_processed_at = datetime.utcnow()

        await db.commit()
        await db.refresh(entry)

        return SummarizeResponse(
            summary=result["summary"],
            content_type=result["content_type"],
            processing_time=result["processing_time"],
        )
    except Exception as e:
        import traceback
        from app.utils.logger import logger
        logger.error(f"AI summarize error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}",
        )


@router.get("/prompt", response_model=PromptResponse)
async def get_sage_prompt(db: DbSession, current_user: CurrentUser):
    """获取智者提示词"""
    config_result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == current_user.id)
    )
    config = config_result.scalar_one_or_none()

    if config and config.sage_prompt:
        return PromptResponse(prompt=config.sage_prompt, is_default=False)

    return PromptResponse(prompt=SAGE_HUMAN_PROMPT, is_default=True)


@router.put("/prompt", response_model=PromptResponse)
async def update_sage_prompt(
    data: PromptUpdateRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """更新智者提示词"""
    config_result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == current_user.id)
    )
    config = config_result.scalar_one_or_none()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User config not found"
        )

    config.sage_prompt = data.prompt
    await db.commit()

    return PromptResponse(prompt=config.sage_prompt, is_default=False)


@router.post("/prompt/reset", response_model=PromptResponse)
async def reset_sage_prompt(db: DbSession, current_user: CurrentUser):
    """重置为默认提示词"""
    config_result = await db.execute(
        select(UserConfig).where(UserConfig.user_id == current_user.id)
    )
    config = config_result.scalar_one_or_none()

    if config:
        config.sage_prompt = None
        await db.commit()

    return PromptResponse(prompt=SAGE_HUMAN_PROMPT, is_default=True)
