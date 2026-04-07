import asyncio
from datetime import datetime, timedelta

from sqlalchemy import func, select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.sensor import SensorReading
from app.services.anomaly_service import get_registered_stream, train_isolation_forest

_stream_locks: dict[str, asyncio.Lock] = {}


def _stream_key(project_id: str, device_id: str, metric_name: str) -> str:
    return f"{project_id}:{device_id}:{metric_name}"


def _get_stream_lock(project_id: str, device_id: str, metric_name: str) -> asyncio.Lock:
    key = _stream_key(project_id, device_id, metric_name)
    lock = _stream_locks.get(key)
    if lock is None:
        lock = asyncio.Lock()
        _stream_locks[key] = lock
    return lock


async def _list_streams(db) -> list[tuple[str, str, str]]:
    result = await db.execute(
        select(
            SensorReading.project_id,
            SensorReading.device_id,
            SensorReading.metric_name,
        ).distinct()
    )
    return [(row.project_id, row.device_id, row.metric_name) for row in result.all()]


async def list_project_streams(
    project_id: str,
    db,
    device_id: str | None = None,
    metric_name: str | None = None,
) -> list[tuple[str, str, str]]:
    query = (
        select(
            SensorReading.project_id,
            SensorReading.device_id,
            SensorReading.metric_name,
        )
        .where(SensorReading.project_id == project_id)
        .distinct()
    )
    if device_id:
        query = query.where(SensorReading.device_id == device_id)
    if metric_name:
        query = query.where(SensorReading.metric_name == metric_name)

    result = await db.execute(query)
    return [(row.project_id, row.device_id, row.metric_name) for row in result.all()]


async def _stream_stats(
    project_id: str,
    device_id: str,
    metric_name: str,
    db,
) -> dict:
    result = await db.execute(
        select(
            func.count(SensorReading.id).label("sample_count"),
            func.min(SensorReading.timestamp).label("start_time"),
            func.max(SensorReading.timestamp).label("end_time"),
        ).where(
            SensorReading.project_id == project_id,
            SensorReading.device_id == device_id,
            SensorReading.metric_name == metric_name,
        )
    )
    row = result.one()
    sample_count = int(row.sample_count or 0)
    start_time = row.start_time
    end_time = row.end_time
    span_hours = 0.0
    if start_time and end_time:
        span_hours = max(0.0, (end_time - start_time).total_seconds() / 3600)

    return {
        "sample_count": sample_count,
        "start_time": start_time,
        "end_time": end_time,
        "span_hours": span_hours,
    }


async def _load_training_window(
    project_id: str,
    device_id: str,
    metric_name: str,
    db,
) -> tuple[list[float], list[datetime]]:
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
    values = [row.metric_value for row in readings]
    timestamps = [row.timestamp for row in readings]
    return values, timestamps


async def maybe_train_stream(
    project_id: str,
    device_id: str,
    metric_name: str,
    db,
) -> dict:
    if not settings.auto_model_training_enabled:
        return {"status": "disabled"}

    lock = _get_stream_lock(project_id, device_id, metric_name)
    if lock.locked():
        return {"status": "busy"}

    async with lock:
        stats = await _stream_stats(project_id, device_id, metric_name, db)
        sample_count = stats["sample_count"]
        span_hours = stats["span_hours"]

        if sample_count < settings.auto_model_training_min_samples:
            return {
                "status": "not_ready",
                "reason": "insufficient_samples",
                "sample_count": sample_count,
                "min_samples": settings.auto_model_training_min_samples,
            }

        if span_hours < settings.auto_model_training_min_span_hours:
            return {
                "status": "not_ready",
                "reason": "insufficient_span",
                "span_hours": round(span_hours, 2),
                "min_span_hours": settings.auto_model_training_min_span_hours,
            }

        current = get_registered_stream(project_id, device_id, metric_name)
        is_initial_train = current is None
        current_sample_count = int((current or {}).get("sample_count") or 0)
        trained_at_raw = (current or {}).get("trained_at")
        trained_at = None
        if trained_at_raw:
            try:
                trained_at = datetime.fromisoformat(trained_at_raw)
            except ValueError:
                trained_at = None

        if not is_initial_train:
            if trained_at is None:
                return {"status": "skip", "reason": "missing_trained_at"}

            interval_minutes = settings.auto_model_retrain_interval_minutes
            if datetime.utcnow() - trained_at < timedelta(minutes=interval_minutes):
                return {
                    "status": "skip",
                    "reason": "interval_not_elapsed",
                    "next_retrain_after_minutes": interval_minutes,
                }

            new_samples = sample_count - current_sample_count
            if new_samples < settings.auto_model_retrain_min_new_samples:
                return {
                    "status": "skip",
                    "reason": "not_enough_new_samples",
                    "new_samples": new_samples,
                    "min_new_samples": settings.auto_model_retrain_min_new_samples,
                }

        values, timestamps = await _load_training_window(
            project_id, device_id, metric_name, db
        )
        if len(values) < settings.auto_model_training_min_samples:
            return {
                "status": "not_ready",
                "reason": "insufficient_samples_after_load",
                "sample_count": len(values),
            }

        result = train_isolation_forest(
            project_id=project_id,
            device_id=device_id,
            metric_name=metric_name,
            values=values,
            timestamps=timestamps,
            contamination=0.03,
        )

        return {
            "status": "trained" if is_initial_train else "retrained",
            "project_id": project_id,
            "device_id": device_id,
            "metric_name": metric_name,
            "model_version": result.get("model_version"),
            "storage_backend": result.get("storage_backend"),
            "sample_count": result.get("sample_count"),
        }


async def run_auto_model_training_loop() -> None:
    if not settings.auto_model_training_enabled:
        print("Auto model training is disabled")
        return

    scan_interval = max(30, int(settings.auto_model_training_scan_interval_seconds))
    print(f"Auto model training monitor started (scan interval: {scan_interval}s)")

    while True:
        try:
            async with AsyncSessionLocal() as db:
                streams = await _list_streams(db)
                for project_id, device_id, metric_name in streams:
                    try:
                        result = await maybe_train_stream(
                            project_id=project_id,
                            device_id=device_id,
                            metric_name=metric_name,
                            db=db,
                        )
                        if result.get("status") in {"trained", "retrained"}:
                            print(
                                "Auto model training:",
                                result["status"],
                                result["project_id"],
                                result["device_id"],
                                result["metric_name"],
                                result.get("model_version"),
                            )
                    except Exception as exc:
                        print(
                            f"Auto model training failed for {project_id}:{device_id}:{metric_name}: {exc}"
                        )
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            print(f"Auto model training loop error: {exc}")

        await asyncio.sleep(scan_interval)


async def trigger_auto_model_training(
    project_id: str,
    device_id: str,
    metric_name: str,
) -> dict:
    if not settings.auto_model_training_enabled:
        return {"status": "disabled"}

    try:
        async with AsyncSessionLocal() as db:
            return await maybe_train_stream(
                project_id=project_id,
                device_id=device_id,
                metric_name=metric_name,
                db=db,
            )
    except Exception as exc:
        print(
            f"Auto model training trigger failed for {project_id}:{device_id}:{metric_name}: {exc}"
        )
        return {"status": "error", "reason": str(exc)}


async def run_manual_auto_train_check(
    project_id: str,
    device_id: str | None = None,
    metric_name: str | None = None,
) -> dict:
    if not settings.auto_model_training_enabled:
        return {
            "status": "disabled",
            "message": "Auto model training is disabled",
        }

    async with AsyncSessionLocal() as db:
        streams = await list_project_streams(
            project_id=project_id,
            db=db,
            device_id=device_id,
            metric_name=metric_name,
        )

        if not streams:
            return {
                "status": "no_streams",
                "project_id": project_id,
                "streams": [],
            }

        results = []
        counts: dict[str, int] = {}

        for pid, did, mname in streams:
            result = await maybe_train_stream(
                project_id=pid,
                device_id=did,
                metric_name=mname,
                db=db,
            )
            result.setdefault("project_id", pid)
            result.setdefault("device_id", did)
            result.setdefault("metric_name", mname)
            results.append(result)
            status = str(result.get("status", "unknown"))
            counts[status] = counts.get(status, 0) + 1

        return {
            "status": "ok",
            "project_id": project_id,
            "total_streams": len(results),
            "counts": counts,
            "streams": results,
        }