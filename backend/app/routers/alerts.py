from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db
from app.models.user import User
from app.models.alert import AlertRule, AlertHistory
from app.utils.dependencies import get_current_user
from app.schemas.alert import AlertRuleCreate, AlertRuleOut, AlertHistoryOut
from app.routers.data import verify_project_owner
from app.services.anomaly_service import (
    get_data_readiness,
    train_isolation_forest,
)
from app.models.sensor import SensorReading

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.post("/{project_id}/rules", response_model=AlertRuleOut, status_code=201)
async def create_alert_rule(
    project_id: str,
    data: AlertRuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_owner(project_id, current_user, db)

    rule = AlertRule(
        project_id=project_id,
        device_id=data.device_id,
        metric_name=data.metric_name,
        condition=data.condition,
        threshold_value=data.threshold_value,
        cooldown_minutes=data.cooldown_minutes,
    )
    db.add(rule)
    await db.flush()
    return rule


@router.get("/{project_id}/rules", response_model=list[AlertRuleOut])
async def get_alert_rules(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_owner(project_id, current_user, db)

    result = await db.execute(
        select(AlertRule).where(
            AlertRule.project_id == project_id
        )
    )
    return result.scalars().all()


@router.delete("/{project_id}/rules/{rule_id}", status_code=204)
async def delete_alert_rule(
    project_id: str,
    rule_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_owner(project_id, current_user, db)

    result = await db.execute(
        select(AlertRule).where(
            AlertRule.id == rule_id,
            AlertRule.project_id == project_id,
        )
    )
    rule = result.scalar_one_or_none()
    if rule:
        await db.delete(rule)


@router.patch("/{project_id}/rules/{rule_id}/toggle", response_model=AlertRuleOut)
async def toggle_alert_rule(
    project_id: str,
    rule_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_owner(project_id, current_user, db)

    result = await db.execute(
        select(AlertRule).where(
            AlertRule.id == rule_id,
            AlertRule.project_id == project_id,
        )
    )
    rule = result.scalar_one_or_none()
    if rule:
        rule.is_active = not rule.is_active
    return rule


@router.get("/{project_id}/history", response_model=list[AlertHistoryOut])
async def get_alert_history(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await verify_project_owner(project_id, current_user, db)

    result = await db.execute(
        select(AlertHistory)
        .where(AlertHistory.project_id == project_id)
        .order_by(desc(AlertHistory.sent_at))
        .limit(50)
    )
    return result.scalars().all()




@router.get("/{project_id}/anomaly/readiness")
async def check_readiness(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if enough data exists to train anomaly models."""
    await verify_project_owner(project_id, current_user, db)
    return await get_data_readiness(
        project_id=project_id,
        min_samples=100,
        min_span_hours=1,
        db=db,
    )


@router.post("/{project_id}/anomaly/train/{device_id}/{metric_name}")
async def train_model(
    project_id: str,
    device_id: str,
    metric_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Train Isolation Forest model for a device+metric."""
    await verify_project_owner(project_id, current_user, db)

    # Fetch training data
    result = await db.execute(
        select(SensorReading)
        .where(
            SensorReading.project_id == project_id,
            SensorReading.device_id == device_id,
            SensorReading.metric_name == metric_name,
        )
        .order_by(SensorReading.timestamp)
        .limit(5000)
    )
    readings = result.scalars().all()

    if len(readings) < 100:
        return {
            "status": "insufficient_data",
            "message": f"Need at least 100 readings, have {len(readings)}",
            "readings_count": len(readings),
        }

    values = [r.metric_value for r in readings]
    timestamps = [r.timestamp for r in readings]

    result = train_isolation_forest(
        project_id=project_id,
        device_id=device_id,
        metric_name=metric_name,
        values=values,
        timestamps=timestamps,
        contamination=0.03,
    )

    return {
        "status": "success",
        "message": f"Model trained on {result['sample_count']} readings",
        "model_path": result["model_path"],
        "device_id": device_id,
        "metric_name": metric_name,
    }