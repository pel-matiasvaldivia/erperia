from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
import datetime

from app.core.database import get_db
from app.core.security import get_current_user, RoleChecker
from app.core.tenant import get_current_tenant
from app.models.tenant import Tenant
from app.models.pedido import Pedido
from app.models.comprobante import Comprobante
from app.models.preparacion import OrdenPreparacion
from app.models.ruta import Ruta
from app.models.usuario import Usuario
from app.models.cliente import Cliente
from app.models.producto import Producto
from app.models.caja import CajaDiaria

router = APIRouter(prefix="/dashboard", tags=["Dashboard y Reportes"])

admin_staff = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO", "TENANT_ADMIN"])


@router.get("/kpis")
def get_kpis(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_staff),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Get top KPIs for the current tenant: daily orders, revenue, pending orders,
    active routes, and current cash register status.
    """
    today_start = datetime.datetime.combine(datetime.date.today(), datetime.time.min)
    today_end = datetime.datetime.combine(datetime.date.today(), datetime.time.max)

    # 1. Pedidos del día (tenant-scoped)
    pedidos_hoy = db.query(Pedido).filter(
        Pedido.tenant_id == tenant.id,
        Pedido.fecha >= today_start,
        Pedido.fecha <= today_end
    ).count()

    # 2. Total facturado hoy (tenant-scoped)
    total_facturado_hoy = db.query(func.sum(Comprobante.total)).filter(
        Comprobante.tenant_id == tenant.id,
        Comprobante.fecha >= today_start,
        Comprobante.fecha <= today_end,
        Comprobante.estado != "Anulado"
    ).scalar() or 0.0

    # 3. Pedidos pendientes de preparación (tenant-scoped)
    pedidos_pendientes = db.query(Pedido).filter(
        Pedido.tenant_id == tenant.id,
        Pedido.estado.in_(["Pendiente de preparación", "En preparación"])
    ).count()

    # 4. Rutas activas hoy (tenant-scoped)
    rutas_activas = db.query(Ruta).filter(
        Ruta.tenant_id == tenant.id
    ).join(OrdenPreparacion, OrdenPreparacion.ruta_id == Ruta.id).filter(
        OrdenPreparacion.tenant_id == tenant.id,
        OrdenPreparacion.fecha_despacho >= today_start,
        OrdenPreparacion.fecha_despacho <= today_end
    ).distinct().count()

    # 5. Caja del día: Busca caja ABIERTA o la última abierta hoy
    caja_hoy = db.query(CajaDiaria).filter(
        CajaDiaria.tenant_id == tenant.id,
        CajaDiaria.estado == "ABIERTA"
    ).first()
    
    if not caja_hoy:
        caja_hoy = db.query(CajaDiaria).filter(
            CajaDiaria.tenant_id == tenant.id,
            CajaDiaria.fecha_apertura >= today_start,
            CajaDiaria.fecha_apertura <= today_end
        ).order_by(CajaDiaria.fecha_apertura.desc()).first()

    saldo_caja = 0.0
    if caja_hoy:
        from app.models.caja import MovimientoCaja
        movimientos = db.query(MovimientoCaja).filter(MovimientoCaja.caja_diaria_id == caja_hoy.id).all()
        total_ingresos = sum(m.monto for m in movimientos if m.tipo == "INGRESO")
        total_egresos = sum(m.monto for m in movimientos if m.tipo in ["EGRESO", "PAGO_PROVEEDOR", "PAGO_EMPLEADO", "ADELANTO_EMPLEADO"])
        total_gastos = sum(m.monto for m in movimientos if m.tipo == "GASTO")
        saldo_caja = caja_hoy.monto_apertura + total_ingresos - total_egresos - total_gastos

    return {
        "pedidos_hoy": pedidos_hoy,
        "total_facturado_hoy": round(total_facturado_hoy, 2),
        "pedidos_pendientes": pedidos_pendientes,
        "rutas_activas": rutas_activas,
        "caja": {
            "estado": caja_hoy.estado if caja_hoy else "sin_abrir",
            "saldo_actual": round(saldo_caja, 2),
            "id": caja_hoy.id if caja_hoy else None
        }
    }


@router.get("/reporte-ventas")
def get_reporte_ventas(
    periodo: str = "mes",  # "mes", "semana", "anio"
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_staff),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Sales breakdowns by Client, Product, Route, Driver and Period — tenant-scoped.
    """
    # Compute date range
    today = datetime.date.today()
    if periodo == "semana":
        desde = today - datetime.timedelta(days=7)
    elif periodo == "anio":
        desde = today.replace(month=1, day=1)
    else:  # mes
        desde = today.replace(day=1)

    desde_dt = datetime.datetime.combine(desde, datetime.time.min)

    # 1. Ventas por Cliente (tenant-scoped)
    ventas_cliente = db.query(
        Cliente.razon_social,
        func.sum(Comprobante.total).label("total_ventas"),
        func.count(Comprobante.id).label("comprobantes_count")
    ).join(Pedido, Pedido.cliente_id == Cliente.id)\
     .join(Comprobante, Comprobante.pedido_id == Pedido.id)\
     .filter(
        Cliente.tenant_id == tenant.id,
        Comprobante.tenant_id == tenant.id,
        Comprobante.estado != "Anulado",
        Comprobante.fecha >= desde_dt
     )\
     .group_by(Cliente.razon_social)\
     .order_by(func.sum(Comprobante.total).desc())\
     .limit(10).all()

    # 2. Ventas por Ruta (tenant-scoped)
    ventas_ruta = db.query(
        Ruta.nombre,
        func.sum(Comprobante.total).label("total_ventas")
    ).join(OrdenPreparacion, OrdenPreparacion.ruta_id == Ruta.id)\
     .join(Pedido, Pedido.id == OrdenPreparacion.pedido_id)\
     .join(Comprobante, Comprobante.pedido_id == Pedido.id)\
     .filter(
        Ruta.tenant_id == tenant.id,
        Comprobante.tenant_id == tenant.id,
        Comprobante.estado != "Anulado",
        Comprobante.fecha >= desde_dt
     )\
     .group_by(Ruta.nombre).all()

    # 3. Ventas por Repartidor (tenant-scoped)
    ventas_repartidor = db.query(
        Usuario.nombre,
        func.sum(Comprobante.total).label("total_ventas"),
        func.count(Comprobante.id).label("entregas_count")
    ).select_from(Ruta)\
     .join(Usuario, Usuario.id == Ruta.repartidor_id)\
     .join(OrdenPreparacion, OrdenPreparacion.ruta_id == Ruta.id)\
     .join(Pedido, Pedido.id == OrdenPreparacion.pedido_id)\
     .join(Comprobante, Comprobante.pedido_id == Pedido.id)\
     .filter(
        Ruta.tenant_id == tenant.id,
        Comprobante.tenant_id == tenant.id,
        Comprobante.estado != "Anulado",
        Comprobante.fecha >= desde_dt
     )\
     .group_by(Usuario.nombre).all()

    # 4. Top productos vendidos
    from app.models.pedido import PedidoItem
    from app.models.producto import Producto
    top_productos = db.query(
        Producto.descripcion,
        func.sum(PedidoItem.subtotal).label("total_ventas"),
        func.sum(PedidoItem.peso_real_kg).label("kg_total")
    ).join(PedidoItem, PedidoItem.producto_id == Producto.id)\
     .join(Pedido, Pedido.id == PedidoItem.pedido_id)\
     .filter(
        Producto.tenant_id == tenant.id,
        Pedido.tenant_id == tenant.id,
        Pedido.fecha >= desde_dt
     )\
     .group_by(Producto.descripcion)\
     .order_by(func.sum(PedidoItem.subtotal).desc())\
     .limit(10).all()

    return {
        "periodo": periodo,
        "desde": desde.isoformat(),
        "ventas_por_cliente": [{"cliente": r[0], "total": float(r[1] or 0), "cantidad": r[2]} for r in ventas_cliente],
        "ventas_por_ruta": [{"ruta": r[0], "total": float(r[1] or 0)} for r in ventas_ruta],
        "ventas_por_repartidor": [{"repartidor": r[0], "total": float(r[1] or 0), "entregas": r[2]} for r in ventas_repartidor],
        "top_productos": [{"producto": r[0], "total": float(r[1] or 0), "kg": float(r[2] or 0)} for r in top_productos]
    }
