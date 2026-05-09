"""add demo alerts to demo project

Revision ID: e5f6a1b2c3d4
Revises: d4e5f6a1b2c3
Create Date: 2026-05-09 10:20:00.000000

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6a1b2c3d4'
down_revision: Union[str, None] = 'd4e5f6a1b2c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add demo alerts to the demo project."""
    
    connection = op.get_bind()
    
    # Get demo project ID
    result = connection.execute(
        sa.text(
            """
            SELECT p.id FROM projects p
            JOIN users u ON p.owner_id = u.id
            WHERE u.is_demo = true AND u.email = 'demo@iotplatform.local'
            LIMIT 1
            """
        )
    )
    project_row = result.fetchone()
    if not project_row:
        return  # Demo project not found, skip
    
    project_id = project_row[0]
    
    # Define demo alerts
    alerts = [
        {
            'id': str(uuid.uuid4()),
            'project_id': project_id,
            'device_id': 'esp32-bedroom-01',
            'metric_name': 'temperature',
            'condition': 'greater_than',
            'threshold_value': 30.0,
            'cooldown_minutes': 60,
            'is_active': True,
        },
        {
            'id': str(uuid.uuid4()),
            'project_id': project_id,
            'device_id': 'esp32-bedroom-01',
            'metric_name': 'humidity',
            'condition': 'less_than',
            'threshold_value': 25.0,
            'cooldown_minutes': 60,
            'is_active': True,
        },
        {
            'id': str(uuid.uuid4()),
            'project_id': project_id,
            'device_id': 'outdoor-sensor',
            'metric_name': 'temperature',
            'condition': 'greater_than',
            'threshold_value': 35.0,
            'cooldown_minutes': 120,
            'is_active': True,
        },
    ]
    
    # Insert alerts
    for alert in alerts:
        connection.execute(
            sa.text(
                """
                INSERT INTO alert_rules 
                (id, project_id, device_id, metric_name, condition, threshold_value, cooldown_minutes, is_active)
                VALUES (:id, :project_id, :device_id, :metric_name, :condition, :threshold_value, :cooldown_minutes, :is_active)
                """
            ),
            alert
        )
    
    connection.commit()


def downgrade() -> None:
    """Remove demo alerts."""
    connection = op.get_bind()
    
    # Delete alerts for demo project
    connection.execute(
        sa.text(
            """
            DELETE FROM alert_rules
            WHERE project_id IN (
                SELECT p.id FROM projects p
                JOIN users u ON p.owner_id = u.id
                WHERE u.is_demo = true
            )
            """
        )
    )
    connection.commit()
