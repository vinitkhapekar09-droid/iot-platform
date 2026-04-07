import asyncio

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.sensor import SensorReadingIn, SensorReadingOut
from app.services.ingest_service import ingest_reading
from app.services.alert_service import (
    check_and_trigger_alerts,
    check_and_trigger_anomaly_alerts,
)
from app.services.anomaly_service import score_reading_and_record_event
from app.services.auto_model_training_service import trigger_auto_model_training

router = APIRouter(prefix="/ingest", tags=["Device Ingestion"])


@router.post("", response_model=SensorReadingOut, status_code=201)
async def ingest(
    data: SensorReadingIn,
    x_api_key: str = Header(..., description="Your device API key"),
    db: AsyncSession = Depends(get_db),
):
    # Save the reading
    reading = await ingest_reading(x_api_key, data, db)

    # Check alerts (non-blocking — won't fail ingestion if alert fails)
    try:
        await check_and_trigger_alerts(
            project_id=reading.project_id,
            device_id=data.device_id,
            metric_name=data.metric_name,
            metric_value=data.metric_value,
            db=db,
        )
    except Exception as e:
        print(f"Alert check failed: {e}")

    # Score anomaly and trigger anomaly rules (non-blocking)
    try:
        anomaly_result = await score_reading_and_record_event(
            project_id=reading.project_id,
            device_id=data.device_id,
            metric_name=data.metric_name,
            reading_id=reading.id,
            db=db,
        )
        await check_and_trigger_anomaly_alerts(
            project_id=reading.project_id,
            device_id=data.device_id,
            metric_name=data.metric_name,
            anomaly_score=anomaly_result["anomaly_score"],
            is_anomaly=anomaly_result["is_anomaly"],
            db=db,
        )
    except Exception as e:
        print(f"Anomaly scoring failed: {e}")

    try:
        asyncio.create_task(
            trigger_auto_model_training(
                project_id=reading.project_id,
                device_id=data.device_id,
                metric_name=data.metric_name,
            )
        )
    except Exception as e:
        print(f"Auto model training trigger failed: {e}")

    return reading