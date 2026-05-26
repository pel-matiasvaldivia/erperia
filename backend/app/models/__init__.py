from app.core.database import Base
from app.models.tenant import Tenant
from app.models.usuario import Usuario
from app.models.cliente import Cliente
from app.models.ruta import Ruta
from app.models.listas_precios import ListaPrecios, ListaPreciosDetalle
from app.models.producto import Producto
from app.models.pedido import Pedido, PedidoItem
from app.models.preparacion import OrdenPreparacion, OrdenPreparacionBulto
from app.models.comprobante import Comprobante
from app.models.cuenta_corriente import CuentaCorriente, MovimientoCC
from app.models.configuracion import ConfiguracionSistema
from app.models.caja import CajaDiaria, MovimientoCaja

# This ensures they are registered when Base is imported
__all__ = [
    "Base",
    "Tenant",
    "Usuario",
    "Cliente",
    "Ruta",
    "ListaPrecios",
    "ListaPreciosDetalle",
    "Producto",
    "Pedido",
    "PedidoItem",
    "OrdenPreparacion",
    "OrdenPreparacionBulto",
    "Comprobante",
    "CuentaCorriente",
    "MovimientoCC",
    "ConfiguracionSistema",
    "CajaDiaria",
    "MovimientoCaja"
]
