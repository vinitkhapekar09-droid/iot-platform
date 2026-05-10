#!/usr/bin/env python3
"""Management script for demo data cleanup and maintenance tasks."""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.services.cleanup_service import cleanup_old_demo_data, reset_demo_chat_limits


async def run_cleanup():
    """Run demo data cleanup."""
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        print("Running demo data cleanup...")
        stats = await cleanup_old_demo_data(db)
        print(f"  Sensor readings deleted: {stats['sensor_readings_deleted']}")
        print(f"  Chat counts deleted: {stats['chat_counts_deleted']}")
        if stats["error"]:
            print(f"  Error: {stats['error']}")
            return False

    await engine.dispose()
    return True


async def run_reset_limits():
    """Reset demo user chat limits."""
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        print("Resetting demo chat limits...")
        stats = await reset_demo_chat_limits(db)
        print(f"  Counts reset: {stats['counts_reset']}")
        if stats["error"]:
            print(f"  Error: {stats['error']}")
            return False

    await engine.dispose()
    return True


async def main():
    """Main CLI entry point."""
    if len(sys.argv) < 2:
        print("Usage: python manage.py <command>")
        print("Commands:")
        print("  cleanup         - Clean up old demo data (older than 7 days)")
        print("  reset-limits    - Reset daily chat message limits for demo users")
        sys.exit(1)

    command = sys.argv[1]

    if command == "cleanup":
        success = await run_cleanup()
    elif command == "reset-limits":
        success = await run_reset_limits()
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
