from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional


class UserRegister(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        # Allow standard emails and .local domains for development
        if '@' not in v:
            raise ValueError('Invalid email address')
        local, domain = v.rsplit('@', 1)
        if not local or not domain or '.' not in domain.replace('local', ''):
            # Allow .local domains or standard email formats
            if domain.endswith('.local') or domain.endswith('localhost'):
                return v
            # For other domains, use standard email validation
            try:
                EmailStr.validate(v)
            except ValueError:
                raise ValueError('Invalid email address')
        return v


class UserLogin(BaseModel):
    email: str
    password: str
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        # Allow standard emails and .local domains for development
        if '@' not in v:
            raise ValueError('Invalid email address')
        local, domain = v.rsplit('@', 1)
        if not local or not domain:
            raise ValueError('Invalid email address')
        # Allow .local domains for development
        if domain.endswith('.local') or domain.endswith('localhost'):
            return v
        # For other domains, use standard email validation
        try:
            EmailStr.validate(v)
        except ValueError:
            raise ValueError('Invalid email address')
        return v


class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    alert_email: Optional[str] = None
    is_active: bool
    is_demo: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
