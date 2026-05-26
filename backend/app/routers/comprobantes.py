from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from app.core.database import get_db
from app.core.security import get_current_user, RoleChecker
from app.core.tenant import get_current_tenant
from app.models.tenant import Tenant
from app.models.pedido import Pedido, PedidoItem
from app.models.comprobante import Comprobante
from app.models.preparacion import OrdenPreparacion
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.models.configuracion import ConfiguracionSistema
from app.schemas.comprobante import ComprobanteCreate, ComprobanteResponse
from app.core.celery_app import generar_pdf_comprobante_task, enviar_notificacion_factura_task

router = APIRouter(prefix="/comprobantes", tags=["Comprobantes (Facturas/Remitos)"])

admin_staff = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO", "TENANT_ADMIN"])
read_access = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO", "VENDEDOR", "TENANT_ADMIN"])


@router.get("/", response_model=List[ComprobanteResponse])
def list_comprobantes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(read_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Get list of commercial bills for the current tenant.
    CLIENTE role filters to show only their own bills.
    """
    query = db.query(Comprobante).filter(Comprobante.tenant_id == tenant.id)

    if current_user.rol == "CLIENTE":
        cliente = db.query(Cliente).filter(
            Cliente.usuario_id == current_user.id,
            Cliente.tenant_id == tenant.id
        ).first()
        if not cliente:
            return []
        query = query.join(Pedido).filter(Pedido.cliente_id == cliente.id)

    return query.order_by(Comprobante.fecha.desc()).all()


@router.get("/{comprobante_id}", response_model=ComprobanteResponse)
def get_comprobante(
    comprobante_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(read_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Get detail of a billing document (tenant-scoped).
    """
    comp = db.query(Comprobante).filter(
        Comprobante.id == comprobante_id,
        Comprobante.tenant_id == tenant.id
    ).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")

    if current_user.rol == "CLIENTE":
        cliente = db.query(Cliente).filter(
            Cliente.usuario_id == current_user.id,
            Cliente.tenant_id == tenant.id
        ).first()
        if not cliente or comp.pedido.cliente_id != cliente.id:
            raise HTTPException(status_code=403, detail="No autorizado para ver este comprobante")

    return comp


@router.post("/", response_model=ComprobanteResponse)
def create_comprobante(
    comp_in: ComprobanteCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_staff),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Generate Factura or Remito from a confirmed Order of Preparation (tenant-scoped).
    Uses tenant's own punto_venta and serial sequence.
    """
    # 1. Validate Pedido - must belong to this tenant
    pedido = db.query(Pedido).filter(
        Pedido.id == comp_in.pedido_id,
        Pedido.tenant_id == tenant.id
    ).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    # Check if a non-canceled bill already exists for this tenant
    existing_comp = db.query(Comprobante).filter(
        Comprobante.pedido_id == pedido.id,
        Comprobante.tenant_id == tenant.id,
        Comprobante.estado != "Anulado"
    ).first()
    if existing_comp:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe un comprobante activo ({existing_comp.tipo} N° {existing_comp.numero}) para este pedido."
        )

    # 2. Check preparation state
    prep = db.query(OrdenPreparacion).filter(
        OrdenPreparacion.pedido_id == pedido.id,
        OrdenPreparacion.tenant_id == tenant.id
    ).first()
    if not prep or prep.estado != "Completado":
        raise HTTPException(
            status_code=400,
            detail="No se puede generar comprobante: el pedido no está completado en preparación."
        )

    # 3. Pull actual weights and update Pedido items total
    final_total = 0.0
    for item in pedido.items:
        bulto = next((b for b in prep.bultos if b.producto_id == item.producto_id), None)
        if bulto:
            item.peso_real_kg = bulto.peso_real_kg
            item.subtotal = round(item.precio_unitario * bulto.peso_real_kg, 2)
            final_total += item.subtotal

    pedido.total = round(final_total, 2)
    pedido.estado = "Listo para despacho"

    # 4. Generate numbering serial - PER TENANT sequence
    serial_key = "NUM_FACTURA_SIGUIENTE" if comp_in.tipo == "FACTURA" else "NUM_REMITO_SIGUIENTE"
    config_num = db.query(ConfiguracionSistema).filter(
        ConfiguracionSistema.clave == serial_key,
        ConfiguracionSistema.tenant_id == tenant.id
    ).first()

    next_num = 1
    if config_num:
        next_num = int(config_num.valor)
        config_num.valor = str(next_num + 1)

    # Use tenant's punto_venta (defaults to '0001')
    punto_venta = getattr(tenant, 'punto_venta', '0001') or '0001'
    prefix = "FC" if comp_in.tipo == "FACTURA" else "RM"
    serial_str = f"{prefix}-{punto_venta}-{next_num:08d}"

    # 5. Create Comprobante record with tenant_id
    new_comp = Comprobante(
        tenant_id=tenant.id,
        pedido_id=pedido.id,
        tipo=comp_in.tipo,
        numero=serial_str,
        fecha=datetime.datetime.utcnow(),
        total=pedido.total,
        estado="Emitido"
    )

    db.add(new_comp)
    db.commit()
    db.refresh(new_comp)

    # 6. Trigger Celery tasks asynchronously
    try:
        generar_pdf_comprobante_task.delay(new_comp.id)
        enviar_notificacion_factura_task.delay(pedido.cliente_id, new_comp.id)
    except Exception as e:
        print(f"[Comprobante] Error scheduling celery tasks: {e}")

    return new_comp


@router.patch("/{comprobante_id}/anular")
def anular_comprobante(
    comprobante_id: int,
    motivo: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_staff),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Anula un comprobante (tenant-scoped).
    """
    comp = db.query(Comprobante).filter(
        Comprobante.id == comprobante_id,
        Comprobante.tenant_id == tenant.id
    ).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")
    if comp.estado == "Anulado":
        raise HTTPException(status_code=400, detail="El comprobante ya está anulado")

    comp.estado = "Anulado"
    if motivo:
        comp.observaciones = f"ANULADO: {motivo}"
    db.commit()
    return {"detail": f"Comprobante {comp.numero} anulado exitosamente."}
