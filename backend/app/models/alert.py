import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.project import Project


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[str] = mapped_column(
        String, primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String, ForeignKey("projects.id"), nullable=False
    )
    device_id: Mapped[str] = mapped_column(
        String, nullable=False
    )
    metric_name: Mapped[str] = mapped_column(
        String, nullable=False
    )
    condition: Mapped[str] = mapped_column(
        String, nullable=False
        # "gt" = greater than
        # "lt" = less than
        # "offline" = device offline
        # "anomaly" = model flagged true anomaly
        # "anomaly_score_gt" = score above threshold
    )
    threshold_value: Mapped[float] = mapped_column(
        Float, nullable=True
        # null for offline alerts
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True
    )
    cooldown_minutes: Mapped[int] = mapped_column(
        default=30
        # don't re-alert for 30 minutes
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    project: Mapped["Project"] = relationship(
        "Project", back_populates="alert_rules"
    )


class AlertHistory(Base):
    __tablename__ = "alert_history"

    id: Mapped[str] = mapped_column(
        String, primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String, ForeignKey("projects.id"), nullable=False
    )
    alert_rule_id: Mapped[str] = mapped_column(
        String, ForeignKey("alert_rules.id"), nullable=False
    )
    device_id: Mapped[str] = mapped_column(
        String, nullable=False
    )
    metric_name: Mapped[str] = mapped_column(
        String, nullable=False
    )
    triggered_value: Mapped[float] = mapped_column(
        Float, nullable=True
    )
    message: Mapped[str] = mapped_column(
        String, nullable=False
    )
    sent_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    email_sent: Mapped[bool] = mapped_column(
        Boolean, default=False
    )

    project: Mapped["Project"] = relationship("Project")