from pydantic import BaseModel, EmailStr
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class TenantBaseResponse(BaseModel):
    id: int
    razon_social: str
    logo_url: Optional[str] = None
    color_primario: str
    condicion_iva: str
    
    class Config:
        from_attributes = True

class UsuarioBase(BaseModel):
    nombre: str
    email: EmailStr
    rol: str # PLATFORM_ADMIN, TENANT_ADMIN, ADMINISTRATIVO, VENDEDOR, REPARTIDOR, CLIENTE
    activo: Optional[bool] = True

class UsuarioCreate(UsuarioBase):
    password: str
    tenant_id: Optional[int] = None

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None
    tenant_id: Optional[int] = None

class UsuarioResponse(UsuarioBase):
    id: int
    tenant_id: Optional[int] = None
    tenant: Optional[TenantBaseResponse] = None

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
