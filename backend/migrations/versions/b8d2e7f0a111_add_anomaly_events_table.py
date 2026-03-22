"""add anomaly events table

Revision ID: b8d2e7f0a111
Revises: 7b436b3f6fe7
Create Date: 2026-03-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b8d2e7f0a111"
down_revision: Union[str, None] = "7b436b3f6fe7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "anomaly_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("reading_id", sa.String(), nullable=False),
        sa.Column("device_id", sa.String(), nullable=False),
        sa.Column("metric_name", sa.String(), nullable=False),
        sa.Column("anomaly_score", sa.Float(), nullable=False),
        sa.Column("is_anomaly", sa.Boolean(), nullable=False),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("model_name", sa.String(), nullable=False),
        sa.Column("model_version", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["reading_id"], ["sensor_readings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_anomaly_events_project_id", "anomaly_events", ["project_id"])
    op.create_index("ix_anomaly_events_reading_id", "anomaly_events", ["reading_id"])
    op.create_index("ix_anomaly_events_device_id", "anomaly_events", ["device_id"])
    op.create_index("ix_anomaly_events_metric_name", "anomaly_events", ["metric_name"])
    op.create_index("ix_anomaly_events_created_at", "anomaly_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_anomaly_events_created_at", table_name="anomaly_events")
    op.drop_index("ix_anomaly_events_metric_name", table_name="anomaly_events")
    op.drop_index("ix_anomaly_events_device_id", table_name="anomaly_events")
    op.drop_index("ix_anomaly_events_reading_id", table_name="anomaly_events")
    op.drop_index("ix_anomaly_events_project_id", table_name="anomaly_events")
    op.drop_table("anomaly_events")
