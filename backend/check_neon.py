import asyncio
import ssl
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings


async def check():
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    engine = create_async_engine(
        settings.database_url, connect_args={"ssl": ssl_context}
    )
    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT tablename FROM pg_tables WHERE schemaname='public'")
        )
        tables = result.fetchall()
        print("Tables in Neon:")
        for t in tables:
            print(" ✅", t[0])
    await engine.dispose()


asyncio.run(check())
