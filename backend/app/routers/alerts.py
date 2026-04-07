from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.alert import AlertRule, AlertHistory
from app.utils.dependencies import get_current_user
from app.schemas.alert import AlertRuleCreate, AlertRuleOut, AlertHistoryOut
from app.routers.data import verify_project_owner
from app.services.anomaly_service import (
    get_data_readiness,
    load_registry,
    train_isolation_forest,
)
from app.services.auto_model_training_service import run_manual_auto_train_check
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
        "model_version": result.get("model_version"),
        "storage_backend": result.get("storage_backend"),
        "model_key": result.get("model_key"),
        "device_id": device_id,
        "metric_name": metric_name,
    }


@router.post("/{project_id}/anomaly/auto-train-check")
async def auto_train_check(
    project_id: str,
    device_id: str | None = Query(None),
    metric_name: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger auto-train/retrain checks for a project or stream."""
    await verify_project_owner(project_id, current_user, db)

    if (device_id and not metric_name) or (metric_name and not device_id):
        raise HTTPException(
            status_code=400,
            detail="Provide both device_id and metric_name, or neither.",
        )

    return await run_manual_auto_train_check(
        project_id=project_id,
        device_id=device_id,
        metric_name=metric_name,
    )


@router.get("/{project_id}/anomaly/model-status")
async def get_model_status(
    project_id: str,
    device_id: str | None = Query(None),
    metric_name: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Show model status and last-trained info per stream for a project."""
    await verify_project_owner(project_id, current_user, db)

    stats_query = (
        select(
            SensorReading.device_id,
            SensorReading.metric_name,
            func.count(SensorReading.id).label("sample_count"),
            func.max(SensorReading.timestamp).label("last_seen"),
        )
        .where(SensorReading.project_id == project_id)
        .group_by(SensorReading.device_id, SensorReading.metric_name)
    )
    if device_id:
        stats_query = stats_query.where(SensorReading.device_id == device_id)
    if metric_name:
        stats_query = stats_query.where(SensorReading.metric_name == metric_name)

    stats_result = await db.execute(stats_query)
    rows = stats_result.all()
    stats_map: dict[str, dict] = {}
    for row in rows:
        key = f"{project_id}:{row.device_id}:{row.metric_name}"
        stats_map[key] = {
            "device_id": row.device_id,
            "metric_name": row.metric_name,
            "sample_count": int(row.sample_count or 0),
            "last_seen": row.last_seen.isoformat() if row.last_seen else None,
        }

    registry = load_registry()
    registry_streams = {
        key: meta
        for key, meta in registry.get("streams", {}).items()
        if meta.get("project_id") == project_id
        and (device_id is None or meta.get("device_id") == device_id)
        and (metric_name is None or meta.get("metric_name") == metric_name)
    }

    combined_keys = sorted(set(stats_map.keys()) | set(registry_streams.keys()))
    stream_status = []
    for key in combined_keys:
        meta = registry_streams.get(key)
        stats = stats_map.get(key, {})
        current_samples = int(stats.get("sample_count") or 0)

        if meta:
            trained_at_raw = meta.get("trained_at")
            trained_at = None
            if trained_at_raw:
                try:
                    trained_at = datetime.fromisoformat(trained_at_raw)
                except ValueError:
                    trained_at = None

            next_retrain_at = None
            due_for_retrain = False
            if trained_at is not None:
                next_time = trained_at + timedelta(
                    minutes=int(settings.auto_model_retrain_interval_minutes)
                )
                next_retrain_at = next_time.isoformat()
                new_samples = max(0, current_samples - int(meta.get("sample_count") or 0))
                due_for_retrain = (
                    datetime.utcnow() >= next_time
                    and new_samples >= int(settings.auto_model_retrain_min_new_samples)
                )
            else:
                new_samples = max(0, current_samples - int(meta.get("sample_count") or 0))

            stream_status.append(
                {
                    "project_id": project_id,
                    "device_id": meta.get("device_id", stats.get("device_id")),
                    "metric_name": meta.get("metric_name", stats.get("metric_name")),
                    "model_version": meta.get("latest_model_version") or meta.get("model_version"),
                    "storage_backend": meta.get("storage_backend", "local"),
                    "trained_at": trained_at_raw,
                    "next_retrain_at": next_retrain_at,
                    "due_for_retrain": due_for_retrain,
                    "trained_sample_count": int(meta.get("sample_count") or 0),
                    "current_sample_count": current_samples,
                    "new_samples_since_train": new_samples,
                    "last_seen": stats.get("last_seen"),
                    "status": "trained",
                }
            )
            continue

        stream_status.append(
            {
                "project_id": project_id,
                "device_id": stats.get("device_id"),
                "metric_name": stats.get("metric_name"),
                "model_version": None,
                "storage_backend": None,
                "trained_at": None,
                "next_retrain_at": None,
                "due_for_retrain": False,
                "trained_sample_count": 0,
                "current_sample_count": current_samples,
                "new_samples_since_train": current_samples,
                "last_seen": stats.get("last_seen"),
                "status": "untrained",
            }
        )

    return {
        "project_id": project_id,
        "auto_training_enabled": settings.auto_model_training_enabled,
        "retrain_interval_minutes": settings.auto_model_retrain_interval_minutes,
        "retrain_min_new_samples": settings.auto_model_retrain_min_new_samples,
        "total_streams": len(stream_status),
        "trained_streams": sum(1 for item in stream_status if item["status"] == "trained"),
        "untrained_streams": sum(1 for item in stream_status if item["status"] == "untrained"),
        "streams": stream_status,
    }