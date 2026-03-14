from groq import Groq
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.models.sensor import SensorReading
from app.config import settings
from datetime import datetime
from datetime import timezone, timedelta


def get_groq_client():
    if not settings.groq_api_key:
        raise ValueError("GROQ_API_KEY not configured")
    return Groq(api_key=settings.groq_api_key)


async def fetch_context_data(project_id: str, db: AsyncSession) -> dict:
    """Fetch relevant sensor data to give the AI context."""

    # Latest 50 readings
    latest_result = await db.execute(
        select(SensorReading)
        .where(SensorReading.project_id == project_id)
        .order_by(desc(SensorReading.timestamp))
        .limit(50)
    )
    latest = latest_result.scalars().all()

    IST = timedelta(hours=5, minutes=30)

    # Today's stats per metric
    now_ist = datetime.utcnow() + IST
    today_start = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    avg_result = await db.execute(
        select(
            SensorReading.metric_name,
            func.avg(SensorReading.metric_value).label("avg"),
            func.min(SensorReading.metric_value).label("min"),
            func.max(SensorReading.metric_value).label("max"),
            func.count(SensorReading.id).label("count"),
        )
        .where(
            SensorReading.project_id == project_id,
            SensorReading.timestamp >= today_start,
        )
        .group_by(SensorReading.metric_name)
    )
    averages = avg_result.all()

    latest_formatted = [
        {
            "device_id": r.device_id,
            "metric": r.metric_name,
            "value": round(r.metric_value, 2),
            "unit": r.unit,
            "time": (r.timestamp + IST).strftime("%H:%M:%S"),
        }
        for r in latest[:10]
    ]

    averages_formatted = [
        {
            "metric": row.metric_name,
            "avg": round(row.avg, 2),
            "min": round(row.min, 2),
            "max": round(row.max, 2),
            "count": row.count,
        }
        for row in averages
    ]

    return {
        "latest_readings": latest_formatted,
        "todays_stats": averages_formatted,
    }


async def ask_ai(
    question: str,
    project_id: str,
    db: AsyncSession,
) -> str:
    client = get_groq_client()
    context = await fetch_context_data(project_id, db)

    system_prompt = """You are an IoT data analyst assistant.
You help users understand their sensor data.
Answer questions clearly and concisely.
Always include specific numbers from the data when available.
If data seems abnormal, mention it proactively.
Keep answers under 3 sentences unless more detail is needed."""

    user_prompt = f"""
Here is the current sensor data for this IoT project:

LATEST READINGS (most recent first):
{context["latest_readings"]}

TODAY'S STATISTICS:
{context["todays_stats"]}

User question: {question}
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=300,
        temperature=0.7,
    )

    return response.choices[0].message.content
