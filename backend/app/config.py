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
    do_spaces_region: Optional[str] = None
    do_spaces_bucket: Optional[str] = None
    do_spaces_endpoint: Optional[str] = None
    do_spaces_access_key: Optional[str] = None
    do_spaces_secret_key: Optional[str] = None
    anomaly_model_cache_ttl_seconds: int = 300
    anomaly_model_cache_max_entries: int = 128
    auto_model_training_enabled: bool = True
    auto_model_training_scan_interval_seconds: int = 60
    auto_model_training_min_samples: int = 100
    auto_model_training_min_span_hours: int = 1
    auto_model_retrain_interval_minutes: int = 1440
    auto_model_retrain_min_new_samples: int = 50

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()