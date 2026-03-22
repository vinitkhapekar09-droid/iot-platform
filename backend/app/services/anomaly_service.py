import json
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.anomaly import AnomalyEvent
from app.models.sensor import SensorReading

MODEL_NAME = "isolation_forest"
MODEL_VERSION = "v1"
FEATURE_WINDOW = 10
MODEL_DIR = Path(__file__).resolve().parents[2] / "models"
REGISTRY_PATH = MODEL_DIR / "model_registry.json"


def _ensure_model_dir() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)


def _stream_key(project_id: str, device_id: str, metric_name: str) -> str:
    return f"{project_id}:{device_id}:{metric_name}"


def _default_registry() -> dict:
    return {"streams": {}, "updated_at": datetime.utcnow().isoformat()}


def load_registry() -> dict:
    _ensure_model_dir()
    if not REGISTRY_PATH.exists():
        return _default_registry()
    with REGISTRY_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_registry(registry: dict) -> None:
    _ensure_model_dir()
    registry["updated_at"] = datetime.utcnow().isoformat()
    with REGISTRY_PATH.open("w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)


def make_features(values: list[float], timestamps: list[datetime]) -> np.ndarray:
    arr = np.array(values, dtype=float)
    rolling_mean = []
    rolling_std = []
    delta_prev = []
    hour_norm = []

    for i in range(len(arr)):
        start = max(0, i - FEATURE_WINDOW + 1)
        window = arr[start : i + 1]
        rolling_mean.append(float(window.mean()))
        rolling_std.append(float(window.std() if len(window) > 1 else 0.0))
        delta_prev.append(float(arr[i] - arr[i - 1]) if i > 0 else 0.0)
        hour_norm.append(float(timestamps[i].hour / 23.0 if 23 else 0.0))

    return np.column_stack(
        [arr, np.array(rolling_mean), np.array(rolling_std), np.array(delta_prev), np.array(hour_norm)]
    )


async def get_data_readiness(
    project_id: str,
    min_samples: int,
    min_span_hours: int,
    db: AsyncSession,
) -> dict:
    result = await db.execute(
        select(
            SensorReading.project_id,
            SensorReading.device_id,
            SensorReading.metric_name,
            func.count(SensorReading.id).label("sample_count"),
            func.min(SensorReading.timestamp).label("start_time"),
            func.max(SensorReading.timestamp).label("end_time"),
        )
        .where(SensorReading.project_id == project_id)
        .group_by(
            SensorReading.project_id,
            SensorReading.device_id,
            SensorReading.metric_name,
        )
        .order_by(SensorReading.device_id, SensorReading.metric_name)
    )

    streams = []
    ready_streams = 0
    for row in result.all():
        span_hours = max(
            0.0,
            (row.end_time - row.start_time).total_seconds() / 3600 if row.start_time and row.end_time else 0.0,
        )
        ready = row.sample_count >= min_samples and span_hours >= min_span_hours
        if ready:
            ready_streams += 1
        streams.append(
            {
                "project_id": row.project_id,
                "device_id": row.device_id,
                "metric_name": row.metric_name,
                "sample_count": row.sample_count,
                "start_time": row.start_time,
                "end_time": row.end_time,
                "span_hours": round(span_hours, 2),
                "ready_for_training": ready,
            }
        )

    return {
        "min_samples_required": min_samples,
        "min_span_hours_required": min_span_hours,
        "total_streams": len(streams),
        "ready_streams": ready_streams,
        "streams": streams,
    }


def register_trained_model(
    project_id: str,
    device_id: str,
    metric_name: str,
    model_path: str,
    sample_count: int,
    contamination: float,
) -> None:
    registry = load_registry()
    key = _stream_key(project_id, device_id, metric_name)
    registry["streams"][key] = {
        "project_id": project_id,
        "device_id": device_id,
        "metric_name": metric_name,
        "model_path": model_path,
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "sample_count": sample_count,
        "contamination": contamination,
        "trained_at": datetime.utcnow().isoformat(),
    }
    save_registry(registry)


def train_isolation_forest(
    project_id: str,
    device_id: str,
    metric_name: str,
    values: list[float],
    timestamps: list[datetime],
    contamination: float = 0.03,
) -> dict:
    _ensure_model_dir()
    features = make_features(values, timestamps)
    model = IsolationForest(
        n_estimators=150,
        contamination=contamination,
        random_state=42,
    )
    model.fit(features)

    filename = f"{project_id}_{device_id}_{metric_name}_{MODEL_VERSION}.joblib".replace("/", "_")
    model_path = MODEL_DIR / filename
    joblib.dump(model, model_path)
    register_trained_model(
        project_id=project_id,
        device_id=device_id,
        metric_name=metric_name,
        model_path=str(model_path),
        sample_count=len(values),
        contamination=contamination,
    )
    return {"model_path": str(model_path), "sample_count": len(values)}


def get_registered_stream(project_id: str, device_id: str, metric_name: str) -> dict | None:
    registry = load_registry()
    return registry["streams"].get(_stream_key(project_id, device_id, metric_name))


async def score_reading_and_record_event(
    project_id: str,
    device_id: str,
    metric_name: str,
    reading_id: str,
    db: AsyncSession,
) -> dict:
    stream_meta = get_registered_stream(project_id, device_id, metric_name)
    if not stream_meta:
        return {
            "is_anomaly": False,
            "anomaly_score": 0.0,
            "reason": "model_not_ready",
            "model_name": MODEL_NAME,
            "model_version": MODEL_VERSION,
        }

    model_path = Path(stream_meta["model_path"])
    if not model_path.exists():
        return {
            "is_anomaly": False,
            "anomaly_score": 0.0,
            "reason": "model_missing_on_disk",
            "model_name": MODEL_NAME,
            "model_version": MODEL_VERSION,
        }

    query = (
        select(SensorReading)
        .where(
            SensorReading.project_id == project_id,
            SensorReading.device_id == device_id,
            SensorReading.metric_name == metric_name,
        )
        .order_by(desc(SensorReading.timestamp))
        .limit(FEATURE_WINDOW + 20)
    )
    result = await db.execute(query)
    rows = list(reversed(result.scalars().all()))
    if len(rows) < 5:
        return {
            "is_anomaly": False,
            "anomaly_score": 0.0,
            "reason": "not_enough_context",
            "model_name": MODEL_NAME,
            "model_version": MODEL_VERSION,
        }

    values = [r.metric_value for r in rows]
    timestamps = [r.timestamp for r in rows]
    features = make_features(values, timestamps)
    model = joblib.load(model_path)
    score = float(-model.decision_function(features[-1:].copy())[0])
    prediction = int(model.predict(features[-1:].copy())[0])
    is_anomaly = prediction == -1
    reason = "isolation_forest_flagged" if is_anomaly else "normal"

    event = AnomalyEvent(
        project_id=project_id,
        reading_id=reading_id,
        device_id=device_id,
        metric_name=metric_name,
        anomaly_score=round(score, 6),
        is_anomaly=is_anomaly,
        reason=reason,
        model_name=stream_meta.get("model_name", MODEL_NAME),
        model_version=stream_meta.get("model_version", MODEL_VERSION),
    )
    db.add(event)
    await db.flush()

    return {
        "is_anomaly": is_anomaly,
        "anomaly_score": round(score, 6),
        "reason": reason,
        "model_name": event.model_name,
        "model_version": event.model_version,
        "event_id": event.id,
    }
