"""Chat service for handling messages and rate limiting."""
from datetime import date, datetime
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.chat import ChatMessage, ChatMessageCount
from app.models.user import User

DEMO_CHAT_LIMIT = 10  # Maximum messages per day for demo users


async def get_demo_chat_count_today(user_id: str, db: AsyncSession) -> int:
    """Get the number of chat messages sent by demo user today."""
    today = date.today()
    result = await db.execute(
        select(ChatMessageCount).where(
            and_(
                ChatMessageCount.user_id == user_id,
                ChatMessageCount.count_date == today,
            )
        )
    )
    count_record = result.scalar_one_or_none()
    return count_record.message_count if count_record else 0


async def check_demo_chat_limit(user: User, db: AsyncSession) -> tuple[bool, int]:
    """
    Check if demo user has reached chat message limit.
    Returns (is_allowed, messages_remaining)
    """
    if not user.is_demo:
        return True, -1  # No limit for non-demo users

    today = date.today()
    count = await get_demo_chat_count_today(user.id, db)

    if count >= DEMO_CHAT_LIMIT:
        return False, 0

    return True, DEMO_CHAT_LIMIT - count


async def increment_demo_chat_count(user_id: str, db: AsyncSession) -> None:
    """Increment the chat message count for a demo user."""
    today = date.today()
    result = await db.execute(
        select(ChatMessageCount).where(
            and_(
                ChatMessageCount.user_id == user_id,
                ChatMessageCount.count_date == today,
            )
        )
    )
    count_record = result.scalar_one_or_none()

    if count_record:
        count_record.message_count += 1
        count_record.updated_at = datetime.utcnow()
    else:
        count_record = ChatMessageCount(
            user_id=user_id,
            count_date=today,
            message_count=1,
        )
        db.add(count_record)

    await db.flush()


async def log_chat_message(
    user_id: str,
    project_id: str,
    message: str,
    response: str,
    db: AsyncSession,
) -> ChatMessage:
    """Log a chat message to the database."""
    chat_msg = ChatMessage(
        user_id=user_id,
        project_id=project_id,
        message=message,
        response=response,
    )
    db.add(chat_msg)
    await db.flush()
    return chat_msg
