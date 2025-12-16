"""
认证 API
"""
from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession, CurrentUser
from app.schemas.user import (
    LoginRequest,
    LoginResponse,
    PasswordUpdateRequest,
    UserResponse,
)
from app.services.user_service import (
    authenticate_user,
    create_access_token,
    update_password,
    verify_password,
)

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: DbSession):
    """用户登录"""
    user = await authenticate_user(db, request.username, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})
    return LoginResponse(
        access_token=access_token,
        username=user.username,
    )


@router.put("/password")
async def change_password(
    request: PasswordUpdateRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """修改密码"""
    # 验证旧密码
    if not verify_password(request.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password",
        )

    # 更新密码
    await update_password(db, current_user, request.new_password)
    return {"message": "Password updated successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser):
    """获取当前用户信息"""
    return current_user
