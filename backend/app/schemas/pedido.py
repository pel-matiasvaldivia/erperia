from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.producto import ProductoResponse
from app.schemas.cliente import ClienteResponse

class PedidoItemBase(BaseModel):
    producto_id: int
    cantidad_unidades: float
    peso_estimado_kg: Optional[float] = 0.0

class PedidoItemCreate(PedidoItemBase):
    pass

class PedidoItemResponse(PedidoItemBase):
    id: int
    pedido_id: int
    peso_real_kg: float
    precio_unitario: float
    subtotal: float
    producto: Optional[ProductoResponse] = None

    class Config:
        from_attributes = True

class PedidoBase(BaseModel):
    cliente_id: int
    observaciones: Optional[str] = None

class PedidoCreate(PedidoBase):
    items: List[PedidoItemCreate]

class PedidoUpdate(BaseModel):
    estado: Optional[str] = None # "Pendiente de preparación", "En preparación", "Listo para despacho", etc.
    observaciones: Optional[str] = None
    cliente_id: Optional[int] = None
    items: Optional[List[PedidoItemCreate]] = None

class PedidoResponse(PedidoBase):
    id: int
    administrativo_id: Optional[int] = None
    fecha: datetime
    estado: str
    total: float
    items: List[PedidoItemResponse] = []
    cliente: Optional[ClienteResponse] = None

    class Config:
        from_attributes = True
