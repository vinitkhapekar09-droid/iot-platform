"""populate demo account with historical sensor data

Revision ID: d4e5f6a1b2c3
Revises: c3d4e5f6a1b2
Create Date: 2026-05-09 10:15:00.000000

"""
from typing import Sequence, Union
import uuid
from datetime import datetime, timedelta
import random

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a1b2c3'
down_revision: Union[str, None] = 'c3d4e5f6a1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Populate demo project with 7 days of historical sensor data."""
    
    # Get demo project ID (should exist from previous migration)
    connection = op.get_bind()
    
    # Query to get demo project
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
    
    # Generate historical data for past 7 days
    now = datetime.utcnow()
    start_time = now - timedelta(days=7)
    
    # Sensor configurations
    devices = [
        ("esp32-bedroom-01", [
            ("temperature", 18, 28, "°C"),
            ("humidity", 30, 70, "%"),
            ("pressure", 1000, 1030, "hPa"),
        ]),
        ("outdoor-sensor", [
            ("temperature", 10, 35, "°C"),
            ("humidity", 20, 95, "%"),
            ("pressure", 995, 1035, "hPa"),
        ]),
    ]
    
    readings_data = []
    
    # Generate readings every 15 minutes for 7 days
    current_time = start_time
    while current_time <= now:
        for device_id, metrics in devices:
            for metric_name, min_val, max_val, unit in metrics:
                # Generate realistic data with some noise
                base_value = (min_val + max_val) / 2
                noise = random.uniform(-5, 5)  # Add noise
                value = base_value + noise
                value = max(min_val, min(max_val, value))  # Clamp to range
                
                reading_id = str(uuid.uuid4())
                readings_data.append({
                    'id': reading_id,
                    'project_id': project_id,
                    'device_id': device_id,
                    'metric_name': metric_name,
                    'metric_value': round(value, 2),
                    'unit': unit,
                    'timestamp': current_time,
                })
        
        current_time += timedelta(minutes=15)
    
    # Batch insert the readings
    if readings_data:
        # Build INSERT statement
        insert_stmt = """
        INSERT INTO sensor_readings 
        (id, project_id, device_id, metric_name, metric_value, unit, timestamp)
        VALUES (:id, :project_id, :device_id, :metric_name, :metric_value, :unit, :timestamp)
        """
        
        connection.execute(
            sa.text(insert_stmt),
            readings_data
        )
        connection.commit()


def downgrade() -> None:
    """Remove demo data."""
    connection = op.get_bind()
    
    # Delete sensor readings for demo project
    connection.execute(
        sa.text(
            """
            DELETE FROM sensor_readings
            WHERE project_id IN (
                SELECT p.id FROM projects p
                JOIN users u ON p.owner_id = u.id
                WHERE u.is_demo = true
            )
            """
        )
    )
    connection.commit()
