from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.database import get_db
from app.models.user import User
from app.models.sensor import SensorReading
from app.models.anomaly import AnomalyEvent
from app.models.project import Project
from app.schemas.sensor import (
    AnomalyEventOut,
    DataReadinessSummaryOut,
    SensorReadingOut,
)
from app.utils.dependencies import get_current_user
from fastapi import HTTPException, status
from typing import Optional
from app.services.anomaly_service import get_data_readiness
from fastapi.responses import StreamingResponse
import csv
import io
from datetime import datetime, timezone


def parse_iso_datetime(dt_str: str) -> datetime:
    """Parse ISO string (with optional Z/UTC) and return naive UTC DateTime."""
    dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


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
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_owner(project_id, current_user, db)

    query = select(SensorReading).where(SensorReading.project_id == project_id)
    if metric_name:
        query = query.where(SensorReading.metric_name == metric_name)
    if device_id:
        query = query.where(SensorReading.device_id == device_id)
    if start_date:
        query = query.where(SensorReading.timestamp >= parse_iso_datetime(start_date))
    if end_date:
        query = query.where(SensorReading.timestamp <= parse_iso_datetime(end_date))

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


@router.get("/{project_id}/devices")
async def get_devices(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all devices with their latest reading per metric."""
    await verify_project_owner(project_id, current_user, db)

    # Get latest reading per device+metric combo
    subquery = (
        select(
            SensorReading.device_id,
            SensorReading.metric_name,
            func.max(SensorReading.timestamp).label("latest_time"),
        )
        .where(SensorReading.project_id == project_id)
        .group_by(SensorReading.device_id, SensorReading.metric_name)
        .subquery()
    )

    result = await db.execute(
        select(SensorReading)
        .join(
            subquery,
            (SensorReading.device_id == subquery.c.device_id)
            & (SensorReading.metric_name == subquery.c.metric_name)
            & (SensorReading.timestamp == subquery.c.latest_time),
        )
        .order_by(SensorReading.device_id, SensorReading.metric_name)
    )
    readings = result.scalars().all()

    # Group by device
    devices = {}
    for r in readings:
        if r.device_id not in devices:
            devices[r.device_id] = {
                "device_id": r.device_id,
                "last_seen": r.timestamp.isoformat(),
                "metrics": [],
            }
        devices[r.device_id]["metrics"].append(
            {
                "metric_name": r.metric_name,
                "metric_value": r.metric_value,
                "unit": r.unit,
                "timestamp": r.timestamp.isoformat(),
            }
        )
        # Track most recent timestamp across all metrics
        if r.timestamp.isoformat() > devices[r.device_id]["last_seen"]:
            devices[r.device_id]["last_seen"] = r.timestamp.isoformat()

    return list(devices.values())


@router.get("/{project_id}/ml-readiness", response_model=DataReadinessSummaryOut)
async def get_ml_readiness(
    project_id: str,
    min_samples: int = Query(500, ge=50, le=100000),
    min_span_hours: int = Query(24, ge=1, le=720),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_owner(project_id, current_user, db)
    return await get_data_readiness(
        project_id=project_id,
        min_samples=min_samples,
        min_span_hours=min_span_hours,
        db=db,
    )


@router.get("/{project_id}/anomalies", response_model=list[AnomalyEventOut])
async def get_anomalies(
    project_id: str,
    device_id: Optional[str] = Query(None),
    metric_name: Optional[str] = Query(None),
    only_flagged: bool = Query(True),
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_owner(project_id, current_user, db)

    query = select(AnomalyEvent).where(AnomalyEvent.project_id == project_id)
    if device_id:
        query = query.where(AnomalyEvent.device_id == device_id)
    if metric_name:
        query = query.where(AnomalyEvent.metric_name == metric_name)
    if only_flagged:
        query = query.where(AnomalyEvent.is_anomaly)

    query = query.order_by(desc(AnomalyEvent.created_at)).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{project_id}/export/csv")
async def export_csv(
    project_id: str,
    device_id: Optional[str] = Query(None),
    metric_name: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export sensor readings as CSV file."""
    await verify_project_owner(project_id, current_user, db)

    # Build query
    query = select(SensorReading).where(SensorReading.project_id == project_id)

    if device_id:
        query = query.where(SensorReading.device_id == device_id)
    if metric_name:
        query = query.where(SensorReading.metric_name == metric_name)
    if start_date:
        query = query.where(SensorReading.timestamp >= parse_iso_datetime(start_date))
    if end_date:
        query = query.where(SensorReading.timestamp <= parse_iso_datetime(end_date))

    query = query.order_by(SensorReading.timestamp).limit(50000)
    result = await db.execute(query)
    readings = result.scalars().all()

    # Build CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow(
        ["timestamp", "device_id", "metric_name", "metric_value", "unit", "project_id"]
    )

    # Rows
    for r in readings:
        writer.writerow(
            [
                r.timestamp.isoformat(),
                r.device_id,
                r.metric_name,
                r.metric_value,
                r.unit or "",
                r.project_id,
            ]
        )

    output.seek(0)

    filename = f"iot_data_{project_id[:8]}"
    if device_id:
        filename += f"_{device_id}"
    filename += f"_{datetime.utcnow().strftime('%Y%m%d')}.csv"

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{project_id}/stats/{device_id}/{metric_name}")
async def get_stats(
    project_id: str,
    device_id: str,
    metric_name: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get statistics for a device metric."""
    await verify_project_owner(project_id, current_user, db)

    query = select(
        func.count(SensorReading.id).label("count"),
        func.avg(SensorReading.metric_value).label("avg"),
        func.min(SensorReading.metric_value).label("min"),
        func.max(SensorReading.metric_value).label("max"),
        func.stddev(SensorReading.metric_value).label("stddev"),
    ).where(
        SensorReading.project_id == project_id,
        SensorReading.device_id == device_id,
        SensorReading.metric_name == metric_name,
    )

    if start_date:
        query = query.where(SensorReading.timestamp >= parse_iso_datetime(start_date))
    if end_date:
        query = query.where(SensorReading.timestamp <= parse_iso_datetime(end_date))

    result = await db.execute(query)
    row = result.first()

    return {
        "device_id": device_id,
        "metric_name": metric_name,
        "count": row.count or 0,
        "avg": round(float(row.avg), 2) if row.avg else 0,
        "min": round(float(row.min), 2) if row.min else 0,
        "max": round(float(row.max), 2) if row.max else 0,
        "stddev": round(float(row.stddev), 2) if row.stddev else 0,
    }
