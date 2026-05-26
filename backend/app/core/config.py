import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Frigorífico J&E ERP"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = "super_secret_jwt_key_123456789_je"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # DB & Services
    DATABASE_URL: str = "postgresql://postgres:postgres_password@db:5432/frigodb"
    REDIS_URL: str = "redis://redis:6379/0"
    
    # CORS
    CORS_ORIGINS: Union[str, List[str]] = "*"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            if v == "*":
                return ["*"]
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Enterprise details
    EMPRESA_NOMBRE: str = "FRIGORIFICO DE CERDO J&E"
    EMPRESA_CUIT: str = "30-71543210-9"
    EMPRESA_DIRECCION: str = "Av. Circunvalación N° 4500, Córdoba, Argentina"
    EMPRESA_TELEFONO: str = "+5493512345678"
    EMPRESA_EMAIL: str = "contacto@frigorificoje.com.ar"
    
    # Geolocation & Platform
    GOOGLE_MAPS_API_KEY: str = ""
    PLATFORM_ADMIN_EMAIL: str = "tenant-admin@erperia.com.ar"
    PLATFORM_ADMIN_PASSWORD: str = "Tenant-admin123"
    BOT_SECRET: str = "frigo-bot-secret"
    
    # PDF Upload directory
    UPLOAD_DIR: str = "/app/uploads"

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()

# Ensure Upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
