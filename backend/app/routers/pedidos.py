from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from app.core.database import get_db
from app.core.security import get_current_user, RoleChecker
from app.core.tenant import get_current_tenant
from app.models.tenant import Tenant
from app.models.pedido import Pedido, PedidoItem
from app.models.cliente import Cliente
from app.models.listas_precios import ListaPreciosDetalle
from app.models.preparacion import OrdenPreparacion, OrdenPreparacionBulto
from app.models.usuario import Usuario
from app.models.cuenta_corriente import CuentaCorriente
from app.schemas.pedido import PedidoCreate, PedidoResponse, PedidoUpdate

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])

admin_staff_sales = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO", "VENDEDOR"])
write_access = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO", "VENDEDOR"])

@router.get("/", response_model=List[PedidoResponse])
def list_pedidos(
    estado: Optional[str] = None,
    cliente_id: Optional[int] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(admin_staff_sales),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Get list of sales orders with filtering capabilities.
    If role is CLIENTE, they can only view their own orders.
    """
    query = db.query(Pedido).filter(Pedido.tenant_id == tenant.id)
    
    # Role isolation
    if current_user.rol == "CLIENTE":
        # Find matching cliente record
        cliente = db.query(Cliente).filter(Cliente.usuario_id == current_user.id, Cliente.tenant_id == tenant.id).first()
        if not cliente:
            return []
        query = query.filter(Pedido.cliente_id == cliente.id)
    elif cliente_id:
        query = query.filter(Pedido.cliente_id == cliente_id)
        
    if estado:
        query = query.filter(Pedido.estado == estado)
        
    if fecha_inicio:
        try:
            start_dt = datetime.datetime.strptime(fecha_inicio, "%Y-%m-%d")
            query = query.filter(Pedido.fecha >= start_dt)
        except ValueError:
            pass
            
    if fecha_fin:
        try:
            end_dt = datetime.datetime.strptime(fecha_fin, "%Y-%m-%d") + datetime.timedelta(days=1)
            query = query.filter(Pedido.fecha < end_dt)
        except ValueError:
            pass
            
    return query.order_by(Pedido.fecha.desc()).all()

@router.get("/{pedido_id}", response_model=PedidoResponse)
def get_pedido(
    pedido_id: int, 
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(admin_staff_sales),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Fetch a single sales order. Filters by client ID if client role.
    """
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id, Pedido.tenant_id == tenant.id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
        
    if current_user.rol == "CLIENTE":
        cliente = db.query(Cliente).filter(Cliente.usuario_id == current_user.id, Cliente.tenant_id == tenant.id).first()
        if not cliente or pedido.cliente_id != cliente.id:
            raise HTTPException(status_code=403, detail="No autorizado para ver este pedido")
            
    return pedido

@router.post("/", response_model=dict)
def create_pedido(
    pedido_in: PedidoCreate, 
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(write_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Create a new sales order (Nota de Pedido). 
    Fetches price list of client, sets prices, performs credit check.
    Generates preparation order in background.
    """
    # 1. Verify Client belongs to tenant
    cliente = db.query(Cliente).filter(Cliente.id == pedido_in.cliente_id, Cliente.tenant_id == tenant.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
    if not cliente.lista_precios_id:
        raise HTTPException(
            status_code=400, 
            detail="El cliente no tiene asignada una lista de precios activa"
        )
        
    # 2. Check Credit Limit
    cc = db.query(CuentaCorriente).filter(CuentaCorriente.cliente_id == cliente.id, CuentaCorriente.tenant_id == tenant.id).first()
    saldo_actual = cc.saldo_actual if cc else 0.0
    limite_credito = cliente.limite_credito or 0.0
    
    # 3. Create items and compute total
    db_items = []
    estimated_total = 0.0
    
    for item in pedido_in.items:
        # Retrieve price of product on client's list
        det = db.query(ListaPreciosDetalle).filter(
            ListaPreciosDetalle.lista_precios_id == cliente.lista_precios_id,
            ListaPreciosDetalle.producto_id == item.producto_id
        ).first()
        
        if not det:
            raise HTTPException(
                status_code=400,
                detail=f"El producto con ID {item.producto_id} no tiene precio en la lista {cliente.lista_precios_id}"
            )
            
        weight_est = item.peso_estimado_kg if item.peso_estimado_kg and item.peso_estimado_kg > 0 else (item.cantidad_unidades * 10.0) # default 10kg per unit
        
        precio_unit = det.precio_venta
        sub = round(precio_unit * weight_est, 2)
        
        db_item = PedidoItem(
            producto_id=item.producto_id,
            cantidad_unidades=item.cantidad_unidades,
            peso_estimado_kg=weight_est,
            peso_real_kg=0.0,
            precio_unitario=precio_unit,
            subtotal=sub
        )
        db_items.append(db_item)
        estimated_total += sub
        
    # Warn warning check
    credit_warn = False
    warning_msg = None
    obs = pedido_in.observaciones or ""
    
    if saldo_actual + estimated_total > limite_credito:
        credit_warn = True
        warning_msg = f"Límite de crédito superado. Límite: ${limite_credito:,.2f}, Saldo actual + pedido: ${(saldo_actual + estimated_total):,.2f}."
        warning_tag = f"[ALERTA: Superó Límite de Crédito por ${(saldo_actual + estimated_total - limite_credito):,.2f}]"
        obs = f"{warning_tag} {obs}".strip()

    # 4. Save Pedido
    new_pedido = Pedido(
        cliente_id=pedido_in.cliente_id,
        administrativo_id=current_user.id if current_user.rol != "CLIENTE" else None,
        fecha=datetime.datetime.utcnow(),
        estado="Pendiente de preparación",
        observaciones=obs,
        total=estimated_total,
        tenant_id=tenant.id
    )
    db.add(new_pedido)
    db.commit()
    db.refresh(new_pedido)
    
    # Save Items
    for db_item in db_items:
        db_item.pedido_id = new_pedido.id
        db.add(db_item)
    db.commit()
    
    # 5. Automatically create Order of Preparation
    prep_order = OrdenPreparacion(
        pedido_id=new_pedido.id,
        ruta_id=cliente.ruta_id,
        fecha_despacho=datetime.datetime.utcnow(),
        estado="Pendiente",
        observaciones=new_pedido.observaciones,
        tenant_id=tenant.id
    )
    db.add(prep_order)
    db.commit()
    db.refresh(prep_order)
    
    # Create bultos for preparation
    for db_item in db_items:
        bulto = OrdenPreparacionBulto(
            orden_id=prep_order.id,
            producto_id=db_item.producto_id,
            unidades=db_item.cantidad_unidades,
            peso_estimado_kg=db_item.peso_estimado_kg,
            peso_real_kg=0.0,
            confirmado=False
        )
        db.add(bulto)
    db.commit()
    
    # Retrieve order response structure (refresh to load all relationships)
    db.refresh(new_pedido)

    return {
        "pedido": jsonable_encoder(new_pedido),
        "warning_credito": credit_warn,
        "mensaje_warning": warning_msg
    }

@router.put("/{pedido_id}", response_model=PedidoResponse)
def update_pedido(
    pedido_id: int,
    pedido_in: PedidoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(write_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Update order details.
    """
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id, Pedido.tenant_id == tenant.id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    old_status = pedido.estado
    
    # 1. Update basic fields
    update_data = pedido_in.model_dump(exclude_unset=True)
    
    if "cliente_id" in update_data:
        new_client_id = update_data.pop("cliente_id")
        if new_client_id:
            cliente = db.query(Cliente).filter(Cliente.id == new_client_id, Cliente.tenant_id == tenant.id).first()
            if not cliente:
                raise HTTPException(status_code=400, detail="Cliente no encontrado")
            pedido.cliente_id = new_client_id
            db.flush()
            db.refresh(pedido)

    if "items" in update_data:
        items_in = update_data.pop("items")
        # Sync items
        db.query(PedidoItem).filter(PedidoItem.pedido_id == pedido.id).delete()
        
        new_total = 0.0
        cliente = pedido.cliente
        
        for item_in in items_in:
            det = db.query(ListaPreciosDetalle).filter(
                ListaPreciosDetalle.lista_precios_id == cliente.lista_precios_id,
                ListaPreciosDetalle.producto_id == item_in["producto_id"]
            ).first()
            
            if not det:
                 raise HTTPException(
                    status_code=400,
                    detail=f"El producto ID {item_in['producto_id']} no tiene precio para este cliente"
                )
            
            precio_unit = det.precio_venta
            weight_est = item_in.get("peso_estimado_kg") or (item_in["cantidad_unidades"] * 10.0)
            sub = round(precio_unit * weight_est, 2)
            
            db_item = PedidoItem(
                pedido_id=pedido.id,
                producto_id=item_in["producto_id"],
                cantidad_unidades=item_in["cantidad_unidades"],
                peso_estimado_kg=weight_est,
                precio_unitario=precio_unit,
                subtotal=sub
            )
            db.add(db_item)
            new_total += sub
        
        pedido.total = new_total

    # Update other fields (estado, observaciones)
    for field, value in update_data.items():
        setattr(pedido, field, value)
    
    # 2. Logic to trigger preparation if validated
    if pedido.estado == "Pendiente de preparación" and old_status != "Pendiente de preparación":
        if not pedido.orden_preparacion:
            db.flush()
            db.refresh(pedido)
            
            prep_order = OrdenPreparacion(
                pedido_id=pedido.id,
                ruta_id=pedido.cliente.ruta_id if pedido.cliente else None,
                fecha_despacho=datetime.datetime.utcnow(),
                estado="Pendiente",
                observaciones=pedido.observaciones,
                tenant_id=tenant.id
            )
            db.add(prep_order)
            db.flush()
            
            for item in pedido.items:
                bulto = OrdenPreparacionBulto(
                    orden_id=prep_order.id,
                    producto_id=item.producto_id,
                    unidades=item.cantidad_unidades,
                    peso_estimado_kg=item.peso_estimado_kg,
                    peso_real_kg=0.0,
                    confirmado=False
                )
                db.add(bulto)

    db.commit()
    db.refresh(pedido)
    return pedido

@router.delete("/{pedido_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(write_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Delete a sales order and its associated records.
    """
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id, Pedido.tenant_id == tenant.id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    db.delete(pedido)
    db.commit()
    return None
