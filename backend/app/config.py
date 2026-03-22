from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "IoT Platform"
    app_version: str = "0.1.0"
    debug: bool = False
    secret_key: str
    database_url: str
    groq_api_key: Optional[str] = None
    alert_email: Optional[str] = None
    alert_email_password: Optional[str] = None
    resend_api_key: Optional[str] = None 

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()