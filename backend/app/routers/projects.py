from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.utils.dependencies import get_current_user
from app.schemas.project import (
    ProjectCreate,
    ProjectOut,
    APIKeyCreate,
    APIKeyOut,
    APIKeyCreatedOut,
)
from app.services.project import (
    create_project,
    get_user_projects,
    get_project_by_id,
    delete_project,
    create_api_key,
    get_project_api_keys,
    revoke_api_key,
)

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("", response_model=ProjectOut, status_code=201)
async def create(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await create_project(data, current_user, db)


@router.get("", response_model=list[ProjectOut])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_projects(current_user, db)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_project_by_id(project_id, current_user, db)


@router.delete("/{project_id}", status_code=204)
async def delete(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_project(project_id, current_user, db)


@router.post("/{project_id}/keys", response_model=APIKeyCreatedOut, status_code=201)
async def generate_key(
    project_id: str,
    data: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await create_api_key(project_id, data, current_user, db)
    api_key = result["api_key"]
    return APIKeyCreatedOut(
        id=api_key.id,
        project_id=api_key.project_id,
        label=api_key.label,
        plain_key=result["plain_key"],
        is_active=api_key.is_active,
        created_at=api_key.created_at,
    )


@router.get("/{project_id}/keys", response_model=list[APIKeyOut])
async def list_keys(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_project_api_keys(project_id, current_user, db)


@router.delete("/{project_id}/keys/{key_id}", status_code=204)
async def revoke_key(
    project_id: str,
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await revoke_api_key(project_id, key_id, current_user, db)
