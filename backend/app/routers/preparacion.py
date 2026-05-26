from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
import uuid

from app.core.database import get_db
from app.core.security import get_current_user, RoleChecker
from app.core.tenant import get_current_tenant
from app.models.tenant import Tenant
from app.models.preparacion import OrdenPreparacion, OrdenPreparacionBulto
from app.models.pedido import Pedido
from app.models.usuario import Usuario
from app.models.comprobante import Comprobante
from app.models.configuracion import ConfiguracionSistema
from app.core.celery_app import generar_pdf_comprobante_task, enviar_notificacion_factura_task
from app.utils.label_generator import generate_labels_pdf
from app.schemas.preparacion import OrdenPreparacionResponse, OrdenPreparacionUpdate

router = APIRouter(prefix="/preparacion", tags=["Preparación de Bultos"])

prep_staff = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO", "REPARTIDOR", "TENANT_ADMIN"])
write_access = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO", "TENANT_ADMIN"])


@router.get("/", response_model=List[OrdenPreparacionResponse])
def list_ordenes_preparacion(
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(prep_staff),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Get all preparation orders for the current tenant.
    Can filter by state (e.g. Pendiente, En preparación, Completado).
    """
    query = db.query(OrdenPreparacion).filter(OrdenPreparacion.tenant_id == tenant.id)
    if estado:
        query = query.filter(OrdenPreparacion.estado == estado)
    return query.order_by(OrdenPreparacion.fecha_despacho.desc()).all()


@router.get("/{orden_id}", response_model=OrdenPreparacionResponse)
def get_orden_preparacion(
    orden_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(prep_staff),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Fetch a single preparation order by ID (scoped to tenant).
    """
    prep = db.query(OrdenPreparacion).filter(
        OrdenPreparacion.id == orden_id,
        OrdenPreparacion.tenant_id == tenant.id
    ).first()
    if not prep:
        raise HTTPException(status_code=404, detail="Orden de preparación no encontrada")
    return prep


@router.put("/{orden_id}", response_model=OrdenPreparacionResponse)
def update_orden_preparacion(
    orden_id: int,
    payload: OrdenPreparacionUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(write_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Confirm weights and update status of preparation order (tenant-scoped).
    When marked as 'Completado', transitions the parent order state and
    AUTOMATICALLY generates a Remito (Delivery Note) with tenant-specific numbering.
    """
    prep = db.query(OrdenPreparacion).filter(
        OrdenPreparacion.id == orden_id,
        OrdenPreparacion.tenant_id == tenant.id
    ).first()
    if not prep:
        raise HTTPException(status_code=404, detail="Orden de preparación no encontrada")

    pedido = db.query(Pedido).filter(
        Pedido.id == prep.pedido_id,
        Pedido.tenant_id == tenant.id
    ).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido asociado no encontrado")

    # 1. Update preparation state
    if payload.estado:
        prep.estado = payload.estado
        if payload.estado == "En preparación":
            pedido.estado = "En preparación"
        elif payload.estado == "Completado":
            pedido.estado = "Listo para despacho"

    if payload.observaciones is not None:
        prep.observaciones = payload.observaciones

    # 2. Update weights on items
    for bulto_in in payload.bultos:
        bulto_db = db.query(OrdenPreparacionBulto).filter(
            OrdenPreparacionBulto.id == bulto_in.id,
            OrdenPreparacionBulto.orden_id == orden_id
        ).first()
        if bulto_db:
            bulto_db.peso_real_kg = bulto_in.peso_real_kg
            bulto_db.confirmado = bulto_in.confirmado
            if bulto_in.confirmado and not bulto_db.tracking_uuid:
                bulto_db.tracking_uuid = f"TRK-{uuid.uuid4().hex[:8].upper()}"

            # Keep parent PedidoItem weight synced
            item_db = next((it for it in pedido.items if it.producto_id == bulto_db.producto_id), None)
            if item_db:
                item_db.peso_real_kg = bulto_in.peso_real_kg
                if bulto_in.confirmado:
                    item_db.subtotal = round(item_db.precio_unitario * bulto_in.peso_real_kg, 2)

    # 3. Finalize and Auto-generate Remito
    if prep.estado == "Completado":
        pedido.total = round(sum(it.subtotal for it in pedido.items), 2)

        # Check if remito already exists (any active remito) - scoped to tenant
        existing_comp = db.query(Comprobante).filter(
            Comprobante.pedido_id == pedido.id,
            Comprobante.tenant_id == tenant.id,
            Comprobante.tipo == "REMITO",
            Comprobante.estado != "Anulado"
        ).first()

        if not existing_comp:
            print(f"[Auto-Remito][Tenant:{tenant.slug}] Generando remito para Pedido #{pedido.id}")

            # --- Numeración por tenant ---
            # El punto de venta se toma del tenant (primer punto de venta = 0001 por defecto)
            punto_venta = getattr(tenant, 'punto_venta', '0001') or '0001'

            config_num = db.query(ConfiguracionSistema).filter(
                ConfiguracionSistema.clave == "NUM_REMITO_SIGUIENTE",
                ConfiguracionSistema.tenant_id == tenant.id
            ).first()
            next_num = 1
            if config_num:
                next_num = int(config_num.valor)
                config_num.valor = str(next_num + 1)

            serial_str = f"RM-{punto_venta}-{next_num:08d}"

            new_comp = Comprobante(
                tenant_id=tenant.id,
                pedido_id=pedido.id,
                tipo="REMITO",
                numero=serial_str,
                fecha=datetime.datetime.utcnow(),
                total=pedido.total,
                estado="Emitido"
            )
            db.add(new_comp)
            db.flush()

            # Trigger tasks
            try:
                generar_pdf_comprobante_task.delay(new_comp.id)
                print(f"[Auto-Remito] Tarea de PDF encolada para Comprobante #{new_comp.id}")
                if pedido.cliente.telefono_whatsapp:
                    enviar_notificacion_factura_task.delay(pedido.cliente_id, new_comp.id)
            except Exception as e:
                print(f"[Auto-Remito] Error triggering tasks: {e}")
        else:
            print(f"[Auto-Remito] Pedido #{pedido.id} ya tiene remito activo (N° {existing_comp.numero})")

    db.commit()
    db.refresh(prep)
    db.refresh(pedido)
    return prep


@router.get("/{orden_id}/labels")
def get_order_labels(
    orden_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant)
):
    orden = db.query(OrdenPreparacion).filter(
        OrdenPreparacion.id == orden_id,
        OrdenPreparacion.tenant_id == tenant.id
    ).first()
    if not orden:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    if orden.estado != "Completado":
        raise HTTPException(status_code=400, detail="La orden debe estar completada para generar etiquetas")

    pdf_path = generate_labels_pdf(db, orden, orden.bultos)
    return {"pdf_path": pdf_path}


@router.get("/bulto/{tracking_uuid}")
def get_bulto_by_tracking(
    tracking_uuid: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant)
):
    bulto = db.query(OrdenPreparacionBulto).join(
        OrdenPreparacion, OrdenPreparacion.id == OrdenPreparacionBulto.orden_id
    ).filter(
        OrdenPreparacionBulto.tracking_uuid == tracking_uuid,
        OrdenPreparacion.tenant_id == tenant.id
    ).first()
    if not bulto:
        raise HTTPException(status_code=404, detail="Bulto no encontrado")
    return {
        "id": bulto.id,
        "producto": bulto.producto.descripcion,
        "peso": bulto.peso_real_kg,
        "estado_logistico": bulto.estado_logistico,
        "cliente": bulto.orden.pedido.cliente.razon_social
    }


@router.post("/scan/{tracking_uuid}")
def scan_bulto(
    tracking_uuid: str,
    action: str,  # "CARGA", "ENTREGA"
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant)
):
    bulto = db.query(OrdenPreparacionBulto).join(
        OrdenPreparacion, OrdenPreparacion.id == OrdenPreparacionBulto.orden_id
    ).filter(
        OrdenPreparacionBulto.tracking_uuid == tracking_uuid,
        OrdenPreparacion.tenant_id == tenant.id
    ).first()
    if not bulto:
        raise HTTPException(status_code=404, detail="Bulto no encontrado")

    if action == "CARGA":
        bulto.estado_logistico = "CARGADO"
        bulto.fecha_carga = datetime.datetime.utcnow()
        if bulto.orden.pedido.estado == "Listo para despacho":
            bulto.orden.pedido.estado = "En reparto"

    elif action == "ENTREGA":
        bulto.estado_logistico = "ENTREGADO"
        bulto.fecha_entrega = datetime.datetime.utcnow()
        all_done = all(b.estado_logistico == "ENTREGADO" for b in bulto.orden.bultos)
        if all_done:
            bulto.orden.pedido.estado = "Entregado"
    else:
        raise HTTPException(status_code=400, detail="Acción no válida")

    db.commit()
    return {
        "status": "ok",
        "new_state": bulto.estado_logistico,
        "pedido_id": bulto.orden.pedido.id,
        "pedido_estado": bulto.orden.pedido.estado
    }
