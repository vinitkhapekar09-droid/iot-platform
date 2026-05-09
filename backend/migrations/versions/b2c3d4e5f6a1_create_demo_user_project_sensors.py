"""create demo user with project and sensors

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-05-09 10:05:00.000000

"""
from typing import Sequence, Union
import uuid
from datetime import datetime

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a1'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create demo user
    demo_user_id = "demo-user-" + str(uuid.uuid4())
    demo_email = "demo@iotplatform.local"
    demo_password_hash = "$2b$12$gCT8lUk4WgB9xxi53WNDdOkFSsgMlIadmK1OGMYzwmy.CHRkUAjLO"  # hash of "demo"
    
    op.execute(
        sa.text(
            f"""
            INSERT INTO users (id, email, hashed_password, full_name, is_active, is_demo, created_at)
            VALUES ('{demo_user_id}', '{demo_email}', '{demo_password_hash}', 'Demo User', true, true, NOW())
            ON CONFLICT (email) DO NOTHING
            """
        )
    )
    
    # Create demo project
    demo_project_id = "demo-project-" + str(uuid.uuid4())
    op.execute(
        sa.text(
            f"""
            INSERT INTO projects (id, name, description, owner_id, created_at)
            SELECT '{demo_project_id}', 'Demo Smart Home', 'Demonstration project with smart home sensors', id, NOW()
            FROM users WHERE email = '{demo_email}' AND is_demo = true
            """
        )
    )
    
    # Create demo sensors
    sensors = [
        ("esp32-bedroom-01", "Bedroom Sensor 1"),
        ("outdoor-sensor", "Outdoor Sensor"),
    ]
    
    for device_id, device_name in sensors:
        op.execute(
            sa.text(
                f"""
                INSERT INTO sensor_readings (id, project_id, device_id, metric_name, metric_value, unit, timestamp)
                SELECT 
                    '{str(uuid.uuid4())}',
                    '{demo_project_id}',
                    '{device_id}',
                    'temperature',
                    22.5,
                    '°C',
                    NOW()
                WHERE EXISTS (SELECT 1 FROM projects WHERE id = '{demo_project_id}')
                """
            )
        )


def downgrade() -> None:
    # Remove demo data - delete in reverse order of dependencies
    op.execute(
        sa.text(
            """
            DELETE FROM sensor_readings 
            WHERE project_id IN (
                SELECT id FROM projects 
                WHERE owner_id IN (
                    SELECT id FROM users WHERE is_demo = true
                )
            )
            """
        )
    )
    
    op.execute(
        sa.text(
            """
            DELETE FROM projects 
            WHERE owner_id IN (
                SELECT id FROM users WHERE is_demo = true
            )
            """
        )
    )
    
    op.execute(
        sa.text(
            """
            DELETE FROM users WHERE is_demo = true
            """
        )
    )
