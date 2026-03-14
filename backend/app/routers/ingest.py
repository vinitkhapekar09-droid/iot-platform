from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.sensor import SensorReadingIn, SensorReadingOut
from app.services.ingest_service import ingest_reading

router = APIRouter(prefix="/ingest", tags=["Device Ingestion"])


@router.post("", response_model=SensorReadingOut, status_code=201)
async def ingest(
    data: SensorReadingIn,
    x_api_key: str = Header(..., description="Your device API key"),
    db: AsyncSession = Depends(get_db),
):
    reading = await ingest_reading(x_api_key, data, db)
    return reading
