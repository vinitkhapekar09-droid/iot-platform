from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.utils.dependencies import get_current_user
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai_service import ask_ai
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
    answer = await ask_ai(request.question, project_id, db)
    return ChatResponse(answer=answer, project_id=project_id)
