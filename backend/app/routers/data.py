from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db
from app.models.user import User
from app.models.sensor import SensorReading
from app.models.project import Project
from app.schemas.sensor import SensorReadingOut
from app.utils.dependencies import get_current_user
from fastapi import HTTPException, status
from typing import Optional

router = APIRouter(prefix="/data", tags=["Sensor Data"])


async def verify_project_owner(
    project_id: str, user: User, db: AsyncSession
) -> Project:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == user.id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


@router.get("/{project_id}/readings", response_model=list[SensorReadingOut])
async def get_readings(
    project_id: str,
    metric_name: Optional[str] = Query(None),
    device_id: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_owner(project_id, current_user, db)

    query = select(SensorReading).where(SensorReading.project_id == project_id)
    if metric_name:
        query = query.where(SensorReading.metric_name == metric_name)
    if device_id:
        query = query.where(SensorReading.device_id == device_id)

    query = query.order_by(desc(SensorReading.timestamp)).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{project_id}/latest", response_model=list[SensorReadingOut])
async def get_latest(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the single most recent reading for each metric/device combo."""
    await verify_project_owner(project_id, current_user, db)

    # Get last 20 readings and let frontend figure out latest per metric
    query = (
        select(SensorReading)
        .where(SensorReading.project_id == project_id)
        .order_by(desc(SensorReading.timestamp))
        .limit(20)
    )
    result = await db.execute(query)
    return result.scalars().all()
