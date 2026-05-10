"""Cleanup service for demo data and old records."""
from datetime import datetime, timedelta
from sqlalchemy import select, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.sensor import SensorReading
from app.models.project import Project
from app.models.chat import ChatMessageCount
import logging

logger = logging.getLogger(__name__)

DEMO_DATA_RETENTION_DAYS = 7  # Keep demo data for 7 days


async def cleanup_old_demo_data(db: AsyncSession) -> dict:
    """
    Clean up demo data older than DEMO_DATA_RETENTION_DAYS.
    Returns statistics about what was cleaned up.
    """
    cutoff_date = datetime.utcnow() - timedelta(days=DEMO_DATA_RETENTION_DAYS)
    stats = {
        "sensor_readings_deleted": 0,
        "chat_counts_deleted": 0,
        "error": None,
    }

    try:
        # Get all demo users
        demo_users_result = await db.execute(select(User).where(User.is_demo == True))
        demo_users = demo_users_result.scalars().all()
        demo_user_ids = [u.id for u in demo_users]

        if demo_user_ids:
            # Delete old sensor readings for demo projects
            sensor_delete_query = delete(SensorReading).where(
                and_(
                    SensorReading.project_id.in_(
                        select(Project.id).where(
                            Project.owner_id.in_(demo_user_ids)
                        )
                    ),
                    SensorReading.timestamp < cutoff_date,
                )
            )
            result = await db.execute(sensor_delete_query)
            stats["sensor_readings_deleted"] = result.rowcount

            # Delete old chat message counts
            chat_counts_delete_query = delete(ChatMessageCount).where(
                and_(
                    ChatMessageCount.user_id.in_(demo_user_ids),
                    ChatMessageCount.count_date < cutoff_date.date(),
                )
            )
            result = await db.execute(chat_counts_delete_query)
            stats["chat_counts_deleted"] = result.rowcount

            await db.commit()
            logger.info(f"Demo data cleanup completed: {stats}")

    except Exception as e:
        logger.error(f"Error during demo data cleanup: {e}")
        stats["error"] = str(e)
        await db.rollback()

    return stats


async def reset_demo_chat_limits(db: AsyncSession) -> dict:
    """
    Reset demo user chat message counts daily.
    This is typically called once a day.
    """
    stats = {
        "counts_reset": 0,
        "error": None,
    }

    try:
        yesterday = (datetime.utcnow() - timedelta(days=1)).date()

        # Delete yesterday's counts to allow reset
        delete_query = delete(ChatMessageCount).where(
            ChatMessageCount.count_date < yesterday
        )
        result = await db.execute(delete_query)
        stats["counts_reset"] = result.rowcount

        await db.commit()
        logger.info(f"Demo chat limits reset: {stats}")

    except Exception as e:
        logger.error(f"Error resetting demo chat limits: {e}")
        stats["error"] = str(e)
        await db.rollback()

    return stats
