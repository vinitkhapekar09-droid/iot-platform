from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    owner_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class APIKeyCreate(BaseModel):
    label: str


class APIKeyOut(BaseModel):
    id: str
    project_id: str
    label: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class APIKeyCreatedOut(BaseModel):
    id: str
    project_id: str
    label: str
    plain_key: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
