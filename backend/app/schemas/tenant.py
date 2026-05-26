from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
import re

CONDICIONES_IVA = [
    "Responsable Inscripto",
    "Monotributista", 
    "Exento",
    "Consumidor Final",
    "No Responsable"
]

class TenantBase(BaseModel):
    razon_social: str
    nombre_fantasia: Optional[str] = None
    cuit: str
    direccion: str
    ciudad: Optional[str] = None
    provincia: Optional[str] = None
    pais: str = "Argentina"
    codigo_postal: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    condicion_iva: str = "Responsable Inscripto"
    color_primario: Optional[str] = "#dc2626"
    plan: str = "basico"
    
    @field_validator('condicion_iva')
    @classmethod
    def validate_condicion_iva(cls, v):
        if v not in CONDICIONES_IVA:
            raise ValueError(f"Condición IVA inválida. Opciones: {CONDICIONES_IVA}")
        return v
    
    @field_validator('cuit')
    @classmethod
    def validate_cuit(cls, v):
        # Format: XX-XXXXXXXX-X
        if not re.match(r'^\d{2}-\d{8}-\d{1}$', v):
            raise ValueError("CUIT debe tener formato XX-XXXXXXXX-X")
        return v

class TenantCreate(TenantBase):
    pass

class TenantUpdate(BaseModel):
    razon_social: Optional[str] = None
    nombre_fantasia: Optional[str] = None
    cuit: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    provincia: Optional[str] = None
    pais: Optional[str] = None
    codigo_postal: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    condicion_iva: Optional[str] = None
    logo_url: Optional[str] = None
    color_primario: Optional[str] = None
    plan: Optional[str] = None
    activo: Optional[bool] = None
    fecha_vencimiento: Optional[datetime] = None

class TenantResponse(TenantBase):
    id: int
    slug: str
    logo_url: Optional[str] = None
    latitud: Optional[str] = None
    longitud: Optional[str] = None
    geocodificado: bool = False
    activo: bool
    onboarding_completado: Optional[bool] = False
    fecha_alta: datetime
    fecha_vencimiento: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class TenantStatsResponse(BaseModel):
    tenant_id: int
    total_usuarios: int
    total_clientes: int
    total_clientes_geolocalizados: int
    pedidos_este_mes: int
    pedidos_total: int
    ultimo_pedido: Optional[datetime] = None
