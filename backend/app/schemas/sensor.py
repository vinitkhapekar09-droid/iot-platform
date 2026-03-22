from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SensorReadingIn(BaseModel):
    device_id: str
    metric_name: str
    metric_value: float
    unit: Optional[str] = None


class SensorReadingOut(BaseModel):
    id: str
    project_id: str
    device_id: str
    metric_name: str
    metric_value: float
    unit: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True


class StreamReadinessOut(BaseModel):
    project_id: str
    device_id: str
    metric_name: str
    sample_count: int
    start_time: datetime
    end_time: datetime
    span_hours: float
    ready_for_training: bool


class DataReadinessSummaryOut(BaseModel):
    min_samples_required: int
    min_span_hours_required: int
    total_streams: int
    ready_streams: int
    streams: list[StreamReadinessOut]


class AnomalyEventOut(BaseModel):
    id: str
    project_id: str
    reading_id: str
    device_id: str
    metric_name: str
    anomaly_score: float
    is_anomaly: bool
    reason: Optional[str]
    model_name: str
    model_version: str
    created_at: datetime

    class Config:
        from_attributes = True
