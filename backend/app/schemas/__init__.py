from app.schemas.usuario import Token, TokenData, UsuarioCreate, UsuarioUpdate, UsuarioResponse, LoginRequest
from app.schemas.ruta import RutaCreate, RutaUpdate, RutaResponse
from app.schemas.producto import ProductoCreate, ProductoUpdate, ProductoResponse
from app.schemas.listas_precios import (
    ListaPreciosCreate, ListaPreciosUpdate, ListaPreciosResponse, 
    ListaPreciosDetalleCreate, ListaPreciosDetalleUpdate, ListaPreciosDetalleResponse,
    ListaPreciosConDetalles, BulkPriceUpdate
)
from app.schemas.cliente import ClienteCreate, ClienteUpdate, ClienteResponse
from app.schemas.pedido import PedidoCreate, PedidoUpdate, PedidoResponse, PedidoItemCreate, PedidoItemResponse
from app.schemas.preparacion import OrdenPreparacionUpdate, OrdenPreparacionResponse, OrdenPreparacionBultoUpdate, OrdenPreparacionBultoResponse
from app.schemas.comprobante import ComprobanteCreate, ComprobanteResponse, RepartidorEntregaRequest
from app.schemas.cuenta_corriente import CuentaCorrienteResponse, MovimientoCCResponse, RegistrarPagoRequest
from app.schemas.configuracion import ConfiguracionSistemaUpdate, ConfiguracionSistemaResponse
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse, TenantStatsResponse
from app.schemas.caja import CajaDiariaCreate, CajaDiariaClose, CajaDiariaResponse, MovimientoCajaCreate, MovimientoCajaResponse

# This simplifies imports
__all__ = [
    "Token",
    "TokenData",
    "UsuarioCreate",
    "UsuarioUpdate",
    "UsuarioResponse",
    "LoginRequest",
    "RutaCreate",
    "RutaUpdate",
    "RutaResponse",
    "ProductoCreate",
    "ProductoUpdate",
    "ProductoResponse",
    "ListaPreciosCreate",
    "ListaPreciosUpdate",
    "ListaPreciosResponse",
    "ListaPreciosDetalleCreate",
    "ListaPreciosDetalleUpdate",
    "ListaPreciosDetalleResponse",
    "ListaPreciosConDetalles",
    "BulkPriceUpdate",
    "ClienteCreate",
    "ClienteUpdate",
    "ClienteResponse",
    "PedidoCreate",
    "PedidoUpdate",
    "PedidoResponse",
    "PedidoItemCreate",
    "PedidoItemResponse",
    "OrdenPreparacionUpdate",
    "OrdenPreparacionResponse",
    "OrdenPreparacionBultoUpdate",
    "OrdenPreparacionBultoResponse",
    "ComprobanteCreate",
    "ComprobanteResponse",
    "RepartidorEntregaRequest",
    "CuentaCorrienteResponse",
    "MovimientoCCResponse",
    "RegistrarPagoRequest",
    "ConfiguracionSistemaUpdate",
    "ConfiguracionSistemaResponse",
    "TenantCreate",
    "TenantUpdate",
    "TenantResponse",
    "TenantStatsResponse",
    "CajaDiariaCreate",
    "CajaDiariaClose",
    "CajaDiariaResponse",
    "MovimientoCajaCreate",
    "MovimientoCajaResponse"
]
