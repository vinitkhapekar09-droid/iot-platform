"""create demo api key

Revision ID: f6a1b2c3d4e5
Revises: e5f6a1b2c3d4
Create Date: 2026-05-09 10:25:00.000000

"""
from typing import Sequence, Union
import uuid
import hashlib
from datetime import datetime

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a1b2c3d4e5'
down_revision: Union[str, None] = 'e5f6a1b2c3d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create an API key for the demo project."""
    
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
    
    # Create API key (demo_key_xxxxx)
    api_key_id = str(uuid.uuid4())
    api_key_secret = "demo_key_" + str(uuid.uuid4()).replace('-', '')[:20]
    key_hash = hashlib.sha256(api_key_secret.encode()).hexdigest()
    
    # Insert API key
    connection.execute(
        sa.text(
            """
            INSERT INTO api_keys 
            (id, project_id, label, key_hash, key_prefix, is_active, created_at)
            VALUES (:id, :project_id, :label, :key_hash, :key_prefix, :is_active, :created_at)
            """
        ),
        {
            'id': api_key_id,
            'project_id': project_id,
            'label': 'Demo API Key',
            'key_hash': key_hash,
            'key_prefix': 'demo_key',
            'is_active': True,
            'created_at': datetime.utcnow(),
        }
    )
    
    connection.commit()


def downgrade() -> None:
    """Remove demo API keys."""
    connection = op.get_bind()
    
    # Delete API keys for demo project
    connection.execute(
        sa.text(
            """
            DELETE FROM api_keys
            WHERE project_id IN (
                SELECT p.id FROM projects p
                JOIN users u ON p.owner_id = u.id
                WHERE u.is_demo = true
            )
            """
        )
    )
    connection.commit()
