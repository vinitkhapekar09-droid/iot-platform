from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.utils.dependencies import get_current_user, is_demo_user
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai_service import ask_ai
from app.services.chat_service import (
    check_demo_chat_limit,
    increment_demo_chat_count,
    log_chat_message,
)
from app.routers.data import verify_project_owner

router = APIRouter(prefix="/chat", tags=["AI Chatbot"])


@router.post("/{project_id}", response_model=ChatResponse)
async def chat(
    project_id: str,
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_owner(project_id, current_user, db)

    # Check demo message limit
    if is_demo_user(current_user):
        is_allowed, messages_remaining = await check_demo_chat_limit(current_user, db)
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Demo chat limit (10 messages per day) reached. Please sign up for an account.",
            )

    answer = await ask_ai(request.question, project_id, db)
    
    # Log the message and increment count
    await log_chat_message(
        user_id=current_user.id,
        project_id=project_id,
        message=request.question,
        response=answer,
        db=db,
    )
    
    if is_demo_user(current_user):
        await increment_demo_chat_count(current_user.id, db)
    
    await db.commit()
    
    return ChatResponse(answer=answer, project_id=project_id)
