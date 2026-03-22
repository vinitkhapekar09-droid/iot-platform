import argparse
import asyncio

from sqlalchemy import asc, select

from app.database import AsyncSessionLocal
from app.models.sensor import SensorReading
from app.services.anomaly_service import train_isolation_forest


async def train_models_for_project(
    project_id: str,
    min_samples: int,
    contamination: float,
) -> None:
    async with AsyncSessionLocal() as db:
        stream_result = await db.execute(
            select(
                SensorReading.device_id,
                SensorReading.metric_name,
            )
            .where(SensorReading.project_id == project_id)
            .group_by(SensorReading.device_id, SensorReading.metric_name)
            .order_by(SensorReading.device_id, SensorReading.metric_name)
        )
        streams = stream_result.all()
        if not streams:
            print("No streams found for project.")
            return

        trained = 0
        skipped = 0
        for stream in streams:
            rows_result = await db.execute(
                select(SensorReading)
                .where(
                    SensorReading.project_id == project_id,
                    SensorReading.device_id == stream.device_id,
                    SensorReading.metric_name == stream.metric_name,
                )
                .order_by(asc(SensorReading.timestamp))
            )
            rows = rows_result.scalars().all()
            if len(rows) < min_samples:
                skipped += 1
                print(
                    f"Skipped {stream.device_id}/{stream.metric_name}: "
                    f"{len(rows)} samples < {min_samples}"
                )
                continue

            values = [r.metric_value for r in rows]
            timestamps = [r.timestamp for r in rows]
            out = train_isolation_forest(
                project_id=project_id,
                device_id=stream.device_id,
                metric_name=stream.metric_name,
                values=values,
                timestamps=timestamps,
                contamination=contamination,
            )
            trained += 1
            print(
                f"Trained {stream.device_id}/{stream.metric_name} "
                f"({out['sample_count']} samples) -> {out['model_path']}"
            )

        print(f"Done. Trained: {trained}, Skipped: {skipped}")


def main():
    parser = argparse.ArgumentParser(description="Train anomaly models per stream.")
    parser.add_argument("--project-id", required=True, help="Project UUID")
    parser.add_argument("--min-samples", type=int, default=500)
    parser.add_argument("--contamination", type=float, default=0.03)
    args = parser.parse_args()

    asyncio.run(
        train_models_for_project(
            project_id=args.project_id,
            min_samples=args.min_samples,
            contamination=args.contamination,
        )
    )


if __name__ == "__main__":
    main()
