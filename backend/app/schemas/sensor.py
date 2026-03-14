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
