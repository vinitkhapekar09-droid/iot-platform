from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.alert import AlertRule, AlertHistory
from app.models.user import User
from app.models.project import Project
from app.models.sensor import SensorReading
from app.database import AsyncSessionLocal
import asyncio
from app.services.email_service import (
    send_alert_email,
    send_offline_alert_email,
)


async def get_project_owner_email(
    project_id: str, db: AsyncSession
) -> tuple[str, str]:
    """Get project owner email and project name."""
    result = await db.execute(
        select(Project, User)
        .join(User, Project.owner_id == User.id)
        .where(Project.id == project_id)
    )
    row = result.first()
    if not row:
        return None, None
    project, user = row
    return user.email, project.name


async def is_in_cooldown(
    rule_id: str,
    cooldown_minutes: int,
    db: AsyncSession,
) -> bool:
    """Check if alert was recently sent (cooldown period)."""
    cooldown_start = datetime.utcnow() - timedelta(minutes=cooldown_minutes)
    result = await db.execute(
        select(AlertHistory)
        .where(
            AlertHistory.alert_rule_id == rule_id,
            AlertHistory.sent_at > cooldown_start,
        )
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def check_and_trigger_alerts(
    project_id: str,
    device_id: str,
    metric_name: str,
    metric_value: float,
    db: AsyncSession,
) -> None:
    """
    Called every time a new sensor reading arrives.
    Checks all alert rules for this device+metric.
    Sends email if threshold is crossed.
    """

    # Get all active rules for this device+metric
    result = await db.execute(
        select(AlertRule).where(
            AlertRule.project_id == project_id,
            AlertRule.device_id == device_id,
            AlertRule.metric_name == metric_name,
            AlertRule.is_active == True,
            AlertRule.condition != "offline",
        )
    )
    rules = result.scalars().all()

    if not rules:
        return

    # Get project owner email
    owner_email, project_name = await get_project_owner_email(
        project_id, db
    )
    if not owner_email:
        return

    for rule in rules:
        # Check if condition is met
        triggered = False

        if rule.condition == "gt" and metric_value > rule.threshold_value:
            triggered = True
        elif rule.condition == "lt" and metric_value < rule.threshold_value:
            triggered = True

        if not triggered:
            continue

        # Check cooldown — don't spam alerts
        in_cooldown = await is_in_cooldown(
            rule.id, rule.cooldown_minutes, db
        )
        if in_cooldown:
            print(f"⏳ Alert in cooldown for {device_id} {metric_name}")
            continue

        # Save to alert history
        history = AlertHistory(
            project_id=project_id,
            alert_rule_id=rule.id,
            device_id=device_id,
            metric_name=metric_name,
            triggered_value=metric_value,
            message=f"{device_id} {metric_name} is {metric_value} "
                    f"({'above' if rule.condition == 'gt' else 'below'} "
                    f"threshold {rule.threshold_value})",
            email_sent=False,
        )
        db.add(history)
        await db.flush()

        # Send email
        email_sent = send_alert_email(
            to_email=owner_email,
            device_id=device_id,
            metric_name=metric_name,
            condition=rule.condition,
            threshold_value=rule.threshold_value,
            actual_value=metric_value,
            project_name=project_name,
        )

        # Update email sent status
        history.email_sent = email_sent

        print(
            f"🚨 Alert triggered: {device_id} {metric_name} "
            f"= {metric_value} "
            f"({'>' if rule.condition == 'gt' else '<'} "
            f"{rule.threshold_value})"
        )


async def check_and_trigger_anomaly_alerts(
    project_id: str,
    device_id: str,
    metric_name: str,
    anomaly_score: float,
    is_anomaly: bool,
    db: AsyncSession,
) -> None:
    """Evaluate anomaly-specific alert rules after scoring."""
    result = await db.execute(
        select(AlertRule).where(
            AlertRule.project_id == project_id,
            AlertRule.device_id == device_id,
            AlertRule.metric_name == metric_name,
            AlertRule.is_active == True,
            AlertRule.condition.in_(["anomaly", "anomaly_score_gt"]),
        )
    )
    rules = result.scalars().all()
    if not rules:
        return

    owner_email, project_name = await get_project_owner_email(project_id, db)
    if not owner_email:
        return

    for rule in rules:
        triggered = False
        if rule.condition == "anomaly":
            triggered = is_anomaly
        elif rule.condition == "anomaly_score_gt":
            threshold = float(rule.threshold_value or 0.0)
            triggered = anomaly_score > threshold

        if not triggered:
            continue

        in_cooldown = await is_in_cooldown(rule.id, rule.cooldown_minutes, db)
        if in_cooldown:
            continue

        history = AlertHistory(
            project_id=project_id,
            alert_rule_id=rule.id,
            device_id=device_id,
            metric_name=f"{metric_name}_anomaly",
            triggered_value=anomaly_score,
            message=(
                f"{device_id} {metric_name} anomaly score {anomaly_score:.4f} "
                f"triggered condition {rule.condition}"
            ),
            email_sent=False,
        )
        db.add(history)
        await db.flush()

        email_sent = send_alert_email(
            to_email=owner_email,
            device_id=device_id,
            metric_name=f"{metric_name} anomaly score",
            condition="gt",
            threshold_value=float(rule.threshold_value or 1.0),
            actual_value=anomaly_score,
            project_name=project_name,
        )
        history.email_sent = email_sent


async def check_and_trigger_offline_alerts(db: AsyncSession) -> None:
    """
    Scan active offline rules and send alerts when device has not reported
    within configured timeout minutes.
    """
    result = await db.execute(
        select(AlertRule).where(
            AlertRule.is_active == True,
            AlertRule.condition == "offline",
        )
    )
    rules = result.scalars().all()
    if not rules:
        return

    for rule in rules:
        timeout_minutes = int(rule.threshold_value or 10)

        last_reading_result = await db.execute(
            select(SensorReading)
            .where(
                SensorReading.project_id == rule.project_id,
                SensorReading.device_id == rule.device_id,
            )
            .order_by(SensorReading.timestamp.desc())
            .limit(1)
        )
        last_reading = last_reading_result.scalar_one_or_none()

        # If the device has never reported, skip for now.
        if not last_reading:
            continue

        offline_minutes = int(
            (datetime.utcnow() - last_reading.timestamp).total_seconds() / 60
        )
        if offline_minutes < timeout_minutes:
            continue

        in_cooldown = await is_in_cooldown(
            rule.id, rule.cooldown_minutes, db
        )
        if in_cooldown:
            continue

        owner_email, project_name = await get_project_owner_email(
            rule.project_id, db
        )
        if not owner_email:
            continue

        history = AlertHistory(
            project_id=rule.project_id,
            alert_rule_id=rule.id,
            device_id=rule.device_id,
            metric_name="offline",
            triggered_value=None,
            message=(
                f"{rule.device_id} is offline for {offline_minutes} minutes "
                f"(threshold {timeout_minutes} minutes)"
            ),
            email_sent=False,
        )
        db.add(history)
        await db.flush()

        email_sent = send_offline_alert_email(
            to_email=owner_email,
            device_id=rule.device_id,
            project_name=project_name,
            last_seen_minutes=offline_minutes,
        )
        history.email_sent = email_sent


async def run_offline_alert_monitor(
    interval_seconds: int = 60,
) -> None:
    """Background task that periodically evaluates offline rules."""
    while True:
        try:
            async with AsyncSessionLocal() as db:
                await check_and_trigger_offline_alerts(db)
                await db.commit()
        except Exception as exc:
            print(f"Offline monitor error: {exc}")
        await asyncio.sleep(interval_seconds)