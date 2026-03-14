import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.project import Project
from app.models.api_key import APIKey
from app.models.user import User
from app.schemas.project import ProjectCreate, APIKeyCreate
from app.utils.security import hash_password


def generate_api_key() -> tuple[str, str]:
    """Returns (plain_key, hashed_key)"""
    plain_key = "iotk_" + secrets.token_hex(24)
    hashed_key = hash_password(plain_key)
    return plain_key, hashed_key


async def create_project(data: ProjectCreate, user: User, db: AsyncSession) -> Project:
    project = Project(
        name=data.name,
        description=data.description,
        owner_id=user.id,
    )
    db.add(project)
    await db.flush()
    return project


async def get_user_projects(user: User, db: AsyncSession) -> list[Project]:
    result = await db.execute(select(Project).where(Project.owner_id == user.id))
    return result.scalars().all()


async def get_project_by_id(project_id: str, user: User, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == user.id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


async def delete_project(project_id: str, user: User, db: AsyncSession) -> None:
    project = await get_project_by_id(project_id, user, db)
    await db.delete(project)


async def create_api_key(
    project_id: str, data: APIKeyCreate, user: User, db: AsyncSession
) -> dict:
    project = await get_project_by_id(project_id, user, db)

    plain_key, hashed_key = generate_api_key()
    # Store first 12 chars as prefix for fast lookup
    key_prefix = plain_key[:12]

    api_key = APIKey(
        project_id=project.id,
        label=data.label,
        key_hash=hashed_key,
        key_prefix=key_prefix,
    )
    db.add(api_key)
    await db.flush()

    return {"api_key": api_key, "plain_key": plain_key}


async def get_project_api_keys(
    project_id: str, user: User, db: AsyncSession
) -> list[APIKey]:
    # Verify ownership first
    await get_project_by_id(project_id, user, db)

    result = await db.execute(select(APIKey).where(APIKey.project_id == project_id))
    return result.scalars().all()


async def revoke_api_key(
    project_id: str, key_id: str, user: User, db: AsyncSession
) -> None:
    # Verify ownership
    await get_project_by_id(project_id, user, db)

    result = await db.execute(
        select(APIKey).where(
            APIKey.id == key_id,
            APIKey.project_id == project_id,
        )
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )
    await db.delete(api_key)
