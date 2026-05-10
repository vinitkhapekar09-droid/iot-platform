from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
import re


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
        if not local or not domain:
            raise ValueError('Invalid email address')
        
        # Allow .local and localhost domains for development
        if domain.endswith('.local') or domain.endswith('localhost'):
            return v
        
        # For other domains, use basic email regex validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
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
        
        # Allow .local and localhost domains for development
        if domain.endswith('.local') or domain.endswith('localhost'):
            return v
        
        # For other domains, use basic email regex validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
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
