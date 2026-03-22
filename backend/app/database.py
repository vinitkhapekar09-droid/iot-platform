from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool
from app.config import settings
import ssl


def get_connect_args():
    if "neon.tech" in settings.database_url:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        return {"ssl": ssl_context}
    return {}


def get_engine():
    """Use NullPool for Neon (serverless), regular pool for local."""
    if "neon.tech" in settings.database_url:
        # NullPool: no connection reuse, perfect for serverless
        return create_async_engine(
            settings.database_url,
            echo=settings.debug,
            future=True,
            poolclass=NullPool,
            connect_args=get_connect_args(),
        )
    else:
        # Local Docker: use connection pool
        return create_async_engine(
            settings.database_url,
            echo=settings.debug,
            future=True,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=300,
        )


engine = get_engine()

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()