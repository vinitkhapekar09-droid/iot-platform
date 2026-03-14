import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.api_key import APIKey
from app.models.sensor import SensorReading
from app.schemas.sensor import SensorReadingIn


async def validate_api_key(raw_key: str, db: AsyncSession) -> APIKey:
    """Fast lookup by prefix, then verify with bcrypt."""

    # Step 1 — extract prefix (first 12 chars)
    if len(raw_key) < 12:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format",
        )

    key_prefix = raw_key[:12]

    # Step 2 — find candidate keys by prefix (fast DB lookup)
    result = await db.execute(
        select(APIKey).where(
            APIKey.key_prefix == key_prefix,
            APIKey.is_active == True,
        )
    )
    candidates = result.scalars().all()

    if not candidates:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive API key",
        )

    # Step 3 — bcrypt verify only the matching candidate(s)
    for api_key in candidates:
        match = bcrypt.checkpw(
            raw_key.encode("utf-8"), api_key.key_hash.encode("utf-8")
        )
        if match:
            return api_key

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or inactive API key",
    )


async def ingest_reading(
    raw_key: str,
    data: SensorReadingIn,
    db: AsyncSession,
) -> SensorReading:
    api_key = await validate_api_key(raw_key, db)

    reading = SensorReading(
        project_id=api_key.project_id,
        device_id=data.device_id,
        metric_name=data.metric_name,
        metric_value=data.metric_value,
        unit=data.unit,
    )
    db.add(reading)
    await db.flush()
    return reading
