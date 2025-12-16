"""
用户服务 - 处理用户相关业务逻辑
"""
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session_maker
from app.models.user import User
from app.models.user_config import UserConfig
from app.utils.logger import logger


password_hash = PasswordHash.recommended()


def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)


def get_password_hash(password):
    return password_hash.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建 JWT Token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> Optional[dict]:
    """解码 JWT Token"""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None


async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    """根据用户名获取用户"""
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional[User]:
    """验证用户"""
    user = await get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def update_password(db: AsyncSession, user: User, new_password: str) -> User:
    """更新用户密码"""
    user.hashed_password = get_password_hash(new_password)
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user


async def sync_env_config() -> None:
    """同步 .env 配置到用户设置（仅同步空值字段）"""
    async with async_session_maker() as db:
        # 获取默认用户
        result = await db.execute(select(User))
        user = result.scalar_one_or_none()
        if not user:
            return

        # 获取用户配置
        config_result = await db.execute(
            select(UserConfig).where(UserConfig.user_id == user.id)
        )
        config = config_result.scalar_one_or_none()
        if not config:
            return

        # 仅当数据库字段为空且 .env 有值时同步 Zotero 配置
        updated = False
        if not config.zotero_api_key and settings.zotero_api_key:
            config.zotero_api_key = settings.zotero_api_key
            config.zotero_library_id = settings.zotero_library_id
            config.zotero_library_type = settings.zotero_library_type
            updated = True
            logger.info("Synced Zotero config from .env to existing user")

        # 同步 AI 配置（仅当数据库为空时）
        if not config.ai_api_key and settings.ai_api_key:
            config.ai_api_key = settings.ai_api_key
            config.ai_provider = settings.ai_provider
            config.ai_model = settings.ai_model
            config.ai_base_url = settings.ai_base_url
            updated = True
            logger.info("Synced AI config from .env to existing user")

        if updated:
            await db.commit()


async def init_default_user() -> None:
    """初始化默认用户（应用启动时调用）"""
    async with async_session_maker() as db:
        # 检查是否已存在用户
        result = await db.execute(select(User))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            logger.info(f"Default user already exists: {existing_user.username}")
            # 同步 .env 配置到现有用户
            await sync_env_config()
            return

        # 创建默认用户
        default_user = User(
            username=settings.default_username,
            hashed_password=get_password_hash(settings.default_password),
        )
        db.add(default_user)
        await db.flush()

        # 创建默认用户配置（包括从 .env 同步的 Zotero 配置）
        default_config = UserConfig(
            user_id=default_user.id,
            rss_fetch_interval=settings.rss_fetch_interval,
            unmarked_retention_days=settings.unmarked_retention_days,
            trash_retention_days=settings.trash_retention_days,
            ai_provider=settings.ai_provider,
            ai_model=settings.ai_model,
            ai_api_key=settings.ai_api_key,
            ai_base_url=settings.ai_base_url,
            # Zotero 配置从 .env 文件同步
            zotero_library_id=settings.zotero_library_id,
            zotero_library_type=settings.zotero_library_type,
            zotero_api_key=settings.zotero_api_key,
        )
        db.add(default_config)
        await db.commit()

        logger.info(f"Created default user: {settings.default_username}")
        if settings.zotero_api_key:
            logger.info(f"Synced Zotero config from .env file")
