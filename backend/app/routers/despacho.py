from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import base64
import os
import datetime

from app.core.database import get_db
from app.core.security import get_current_user, RoleChecker
from app.core.tenant import get_current_tenant
from app.models.tenant import Tenant
from app.models.pedido import Pedido
from app.models.comprobante import Comprobante
from app.models.cliente import Cliente
from app.models.ruta import Ruta
from app.models.usuario import Usuario
from app.models.cuenta_corriente import CuentaCorriente, MovimientoCC
from app.schemas.comprobante import ComprobanteResponse, RepartidorEntregaRequest
from app.core.config import settings

router = APIRouter(prefix="/despacho", tags=["Despacho y Reparto"])

repartidor_access = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO", "REPARTIDOR", "TENANT_ADMIN"])


@router.get("/hoja-ruta", response_model=List[dict])
def get_hoja_ruta(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(repartidor_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Get the route delivery sheet for the logged-in driver (tenant-scoped).
    Returns orders that are ready to dispatch or already on route.
    """
    # 1. Build routes query scoped to tenant
    query_routes = db.query(Ruta).filter(Ruta.tenant_id == tenant.id)
    if current_user.rol == "REPARTIDOR":
        query_routes = query_routes.filter(Ruta.repartidor_id == current_user.id)

    routes = query_routes.all()
    route_ids = [r.id for r in routes]

    if not route_ids:
        return []

    # 2. Get active delivery orders scoped to tenant
    orders = db.query(Pedido).join(Cliente).filter(
        Pedido.tenant_id == tenant.id,
        Cliente.ruta_id.in_(route_ids),
        Pedido.estado.in_(["Listo para despacho", "En reparto"])
    ).order_by(Pedido.fecha.desc()).all()

    result = []
    for order in orders:
        comp = db.query(Comprobante).filter(
            Comprobante.pedido_id == order.id,
            Comprobante.tenant_id == tenant.id,
            Comprobante.estado != "Anulado"
        ).first()

        result.append({
            "id": order.id,
            "cliente_razon_social": order.cliente.razon_social,
            "direccion": order.cliente.direccion,
            "telefono_whatsapp": order.cliente.telefono_whatsapp,
            "estado": order.estado,
            "total": order.total,
            "observaciones": order.observaciones,
            "ruta_nombre": order.cliente.ruta.nombre if order.cliente.ruta else "Sin Ruta",
            "comprobante": {
                "id": comp.id,
                "tipo": comp.tipo,
                "numero": comp.numero,
                "pdf_path": comp.pdf_path,
                "estado": comp.estado,
                "firma_repartidor_path": comp.firma_repartidor_path
            } if comp else None
        })

    return result


@router.post("/comprobante/{comprobante_id}/entregar")
def entregar_pedido(
    comprobante_id: int,
    payload: RepartidorEntregaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(repartidor_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Delivery confirmation (tenant-scoped).
    Saves digital signature, changes order/bill status,
    and applies debit transactions to Cuenta Corriente if delivered.
    """
    comp = db.query(Comprobante).filter(
        Comprobante.id == comprobante_id,
        Comprobante.tenant_id == tenant.id
    ).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")

    pedido = db.query(Pedido).filter(
        Pedido.id == comp.pedido_id,
        Pedido.tenant_id == tenant.id
    ).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido asociado no encontrado")

    cliente = db.query(Cliente).filter(
        Cliente.id == pedido.cliente_id,
        Cliente.tenant_id == tenant.id
    ).first()

    # 1. Update pedido status
    pedido.estado = payload.estado_pedido

    obs_extra = ""
    if payload.estado_pedido == "No entregado" and payload.motivo_rechazo:
        obs_extra = f" | RECHAZO: {payload.motivo_rechazo}"

    if payload.observaciones or obs_extra:
        note = payload.observaciones or ""
        pedido.observaciones = f"{pedido.observaciones or ''} | Chofer: {note}{obs_extra}".strip()

    # 2. Save Signature
    if payload.firma_base64:
        try:
            header, data = payload.firma_base64.split(",", 1) if "," in payload.firma_base64 else ("", payload.firma_base64)
            img_data = base64.b64decode(data)

            sig_filename = f"firma_{tenant.slug}_{comp.id}_{datetime.date.today().strftime('%Y%m%d')}.png"
            sig_filepath = os.path.join(settings.UPLOAD_DIR, sig_filename)

            with open(sig_filepath, "wb") as f:
                f.write(img_data)

            comp.firma_repartidor_path = sig_filepath
        except Exception as e:
            print(f"[Despacho] Error saving signature: {e}")

    # 3. Process Account Balance / Ledger updates
    if payload.estado_pedido in ["Entregado", "Entrega parcial"]:
        comp.estado = "Entregado"

        cc = db.query(CuentaCorriente).filter(
            CuentaCorriente.cliente_id == cliente.id,
            CuentaCorriente.tenant_id == tenant.id
        ).first()
        if cc:
            cc.saldo_actual = round(cc.saldo_actual + comp.total, 2)
            cc.fecha_actualizacion = datetime.datetime.utcnow()

            mov_sale = MovimientoCC(
                tenant_id=tenant.id,
                cuenta_id=cc.id,
                tipo="DEBITO",
                monto=comp.total,
                referencia=comp.numero,
                fecha=datetime.datetime.utcnow(),
                descripcion=f"Compra según {comp.tipo} N° {comp.numero}"
            )
            db.add(mov_sale)

            if payload.metodo_pago == "EFECTIVO":
                paid_amount = payload.monto_pagado if payload.monto_pagado > 0 else comp.total
                cc.saldo_actual = round(cc.saldo_actual - paid_amount, 2)

                mov_pay = MovimientoCC(
                    tenant_id=tenant.id,
                    cuenta_id=cc.id,
                    tipo="CREDITO",
                    monto=paid_amount,
                    referencia=f"COBRO-{comp.numero}",
                    fecha=datetime.datetime.utcnow(),
                    descripcion=f"Cobro en efectivo realizado por chofer - Ref {comp.numero}"
                )
                db.add(mov_pay)

            try:
                from app.core.celery_app import generar_pdf_comprobante_task
                generar_pdf_comprobante_task.delay(comp.id)
            except Exception as e:
                print(f"[Despacho] Error scheduling PDF task: {e}")
    else:
        comp.estado = "No Entregado"

    db.commit()
    db.refresh(comp)
    db.refresh(pedido)

    return {
        "detail": f"Pedido actualizado a {payload.estado_pedido} exitosamente.",
        "comprobante_estado": comp.estado,
        "pedido_estado": pedido.estado
    }
