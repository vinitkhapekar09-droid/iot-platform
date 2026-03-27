from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, ValidationError
from app.database import get_db
from app.schemas.user import UserRegister, UserLogin, UserOut, TokenOut
from app.services.auth_service import register_user, login_user
from app.utils.dependencies import get_current_user
from app.models.user import User
import re

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    user = await register_user(data, db)
    return user


@router.post("/login", response_model=TokenOut)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await login_user(data.email, data.password, db)
    return TokenOut(access_token=result["token"], user=result["user"])


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


class UpdateAlertEmailRequest(BaseModel):
    alert_email: str | None = None


def is_valid_email(email: str) -> bool:
    """Simple email validation"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


@router.patch("/me/alert-email", response_model=UserOut)
async def update_alert_email(
    request: UpdateAlertEmailRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user's preferred alert email address."""
    if request.alert_email is not None and request.alert_email.strip() == "":
        request.alert_email = None

    if request.alert_email is not None and not is_valid_email(request.alert_email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid email format",
        )

    current_user.alert_email = request.alert_email
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user
