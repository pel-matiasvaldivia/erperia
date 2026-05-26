from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class MovimientoCajaBase(BaseModel):
    tipo: str  # "INGRESO", "EGRESO", "GASTO", "PAGO_PROVEEDOR", "PAGO_EMPLEADO", "ADELANTO_EMPLEADO"
    monto: float
    descripcion: str
    empleado_id: Optional[int] = None
    proveedor_nombre: Optional[str] = None

class MovimientoCajaCreate(MovimientoCajaBase):
    pass

class UserSimpleResponse(BaseModel):
    id: int
    nombre: str
    email: str
    
    class Config:
        from_attributes = True

class MovimientoCajaResponse(MovimientoCajaBase):
    id: int
    caja_diaria_id: int
    tenant_id: int
    fecha: datetime
    usuario_id: int
    
    usuario: Optional[UserSimpleResponse] = None
    empleado: Optional[UserSimpleResponse] = None

    class Config:
        from_attributes = True

class CajaDiariaBase(BaseModel):
    monto_apertura: float
    observaciones_apertura: Optional[str] = None

class CajaDiariaCreate(CajaDiariaBase):
    pass

class CajaDiariaClose(BaseModel):
    monto_cierre: float
    observaciones_cierre: Optional[str] = None

class CajaDiariaResponse(BaseModel):
    id: int
    tenant_id: int
    usuario_apertura_id: int
    usuario_cierre_id: Optional[int] = None
    fecha_apertura: datetime
    fecha_cierre: Optional[datetime] = None
    monto_apertura: float
    monto_cierre: Optional[float] = None
    estado: str
    observaciones_apertura: Optional[str] = None
    observaciones_cierre: Optional[str] = None
    
    usuario_apertura: Optional[UserSimpleResponse] = None
    usuario_cierre: Optional[UserSimpleResponse] = None
    
    # Summary stats calculated on the fly
    total_ingresos: float = 0.0
    total_egresos: float = 0.0
    total_gastos: float = 0.0
    saldo_calculado: float = 0.0

    class Config:
        from_attributes = True
