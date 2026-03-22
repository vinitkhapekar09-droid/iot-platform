from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AlertRuleCreate(BaseModel):
    device_id: str
    metric_name: str
    condition: str        # "gt", "lt", "offline", "anomaly", "anomaly_score_gt"
    threshold_value: Optional[float] = None
    cooldown_minutes: int = 30


class AlertRuleOut(BaseModel):
    id: str
    project_id: str
    device_id: str
    metric_name: str
    condition: str
    threshold_value: Optional[float]
    is_active: bool
    cooldown_minutes: int
    created_at: datetime

    class Config:
        from_attributes = True


class AlertHistoryOut(BaseModel):
    id: str
    device_id: str
    metric_name: str
    triggered_value: Optional[float]
    message: str
    sent_at: datetime
    email_sent: bool

    class Config:
        from_attributes = True