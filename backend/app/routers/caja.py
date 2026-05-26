from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, RoleChecker
from app.core.tenant import get_current_tenant
from app.models.tenant import Tenant
from app.models.usuario import Usuario
from app.models.caja import CajaDiaria, MovimientoCaja
from app.schemas.caja import (
    CajaDiariaCreate, CajaDiariaClose, CajaDiariaResponse,
    MovimientoCajaCreate, MovimientoCajaResponse
)

router = APIRouter(prefix="/caja", tags=["Caja Diaria"])
admin_or_staff = RoleChecker(["PLATFORM_ADMIN", "TENANT_ADMIN", "ADMINISTRATIVO"])

def compute_caja_totals(caja: CajaDiaria, db: Session):
    movimientos = db.query(MovimientoCaja).filter(MovimientoCaja.caja_diaria_id == caja.id).all()
    
    total_ingresos = 0.0
    total_egresos = 0.0
    total_gastos = 0.0
    
    for m in movimientos:
        if m.tipo == "INGRESO":
            total_ingresos += m.monto
        elif m.tipo in ["EGRESO", "PAGO_PROVEEDOR", "PAGO_EMPLEADO", "ADELANTO_EMPLEADO"]:
            total_egresos += m.monto
        elif m.tipo == "GASTO":
            total_gastos += m.monto
            
    saldo_calculado = caja.monto_apertura + total_ingresos - total_egresos - total_gastos
    
    return {
        "total_ingresos": total_ingresos,
        "total_egresos": total_egresos,
        "total_gastos": total_gastos,
        "saldo_calculado": saldo_calculado
    }

@router.get("/status", response_model=Optional[CajaDiariaResponse])
def get_caja_status(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: Usuario = Depends(admin_or_staff)
):
    """
    Returns the currently active (open) cash box for the tenant, or null if none.
    """
    caja = db.query(CajaDiaria).filter(
        CajaDiaria.tenant_id == tenant.id,
        CajaDiaria.estado == "ABIERTA"
    ).first()
    
    if not caja:
        return None
        
    totals = compute_caja_totals(caja, db)
    
    # Map to schema dynamically
    resp = CajaDiariaResponse.model_validate(caja)
    resp.total_ingresos = totals["total_ingresos"]
    resp.total_egresos = totals["total_egresos"]
    resp.total_gastos = totals["total_gastos"]
    resp.saldo_calculado = totals["saldo_calculado"]
    
    return resp

@router.post("/abrir", response_model=CajaDiariaResponse)
def abrir_caja(
    payload: CajaDiariaCreate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: Usuario = Depends(admin_or_staff)
):
    """
    Opens a new daily cash box session.
    """
    # Check if there is already an open cash box
    existing_open = db.query(CajaDiaria).filter(
        CajaDiaria.tenant_id == tenant.id,
        CajaDiaria.estado == "ABIERTA"
    ).first()
    
    if existing_open:
        raise HTTPException(status_code=400, detail="Ya existe una caja abierta para este tenant.")
        
    caja = CajaDiaria(
        tenant_id=tenant.id,
        usuario_apertura_id=current_user.id,
        monto_apertura=payload.monto_apertura,
        estado="ABIERTA",
        observaciones_apertura=payload.observaciones_apertura
    )
    db.add(caja)
    db.commit()
    db.refresh(caja)
    
    resp = CajaDiariaResponse.model_validate(caja)
    resp.saldo_calculado = payload.monto_apertura
    return resp

@router.post("/cerrar", response_model=CajaDiariaResponse)
def cerrar_caja(
    payload: CajaDiariaClose,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: Usuario = Depends(admin_or_staff)
):
    """
    Closes the currently active cash box session.
    """
    caja = db.query(CajaDiaria).filter(
        CajaDiaria.tenant_id == tenant.id,
        CajaDiaria.estado == "ABIERTA"
    ).first()
    
    if not caja:
        raise HTTPException(status_code=400, detail="No hay ninguna caja abierta para cerrar.")
        
    totals = compute_caja_totals(caja, db)
    
    caja.usuario_cierre_id = current_user.id
    caja.fecha_cierre = datetime.utcnow()
    caja.monto_cierre = payload.monto_cierre
    caja.estado = "CERRADA"
    caja.observaciones_cierre = payload.observaciones_cierre
    
    db.commit()
    db.refresh(caja)
    
    resp = CajaDiariaResponse.model_validate(caja)
    resp.total_ingresos = totals["total_ingresos"]
    resp.total_egresos = totals["total_egresos"]
    resp.total_gastos = totals["total_gastos"]
    resp.saldo_calculado = totals["saldo_calculado"]
    
    return resp

@router.post("/movimientos", response_model=MovimientoCajaResponse)
def registrar_movimiento(
    payload: MovimientoCajaCreate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: Usuario = Depends(admin_or_staff)
):
    """
    Registers a new transaction inside the open cash box.
    """
    caja = db.query(CajaDiaria).filter(
        CajaDiaria.tenant_id == tenant.id,
        CajaDiaria.estado == "ABIERTA"
    ).first()
    
    if not caja:
        raise HTTPException(status_code=400, detail="Debe abrir la caja diaria antes de registrar movimientos.")
        
    # Validate employee if employee payment/advance
    if payload.tipo in ["PAGO_EMPLEADO", "ADELANTO_EMPLEADO"]:
        if not payload.empleado_id:
            raise HTTPException(status_code=400, detail="Debe especificar el empleado para este movimiento.")
        emp = db.query(Usuario).filter(Usuario.id == payload.empleado_id, Usuario.tenant_id == tenant.id).first()
        if not emp:
            raise HTTPException(status_code=400, detail="Empleado no encontrado en este tenant.")
            
    # Validate supplier if supplier payment
    if payload.tipo == "PAGO_PROVEEDOR":
        if not payload.proveedor_nombre:
            raise HTTPException(status_code=400, detail="Debe especificar el nombre del proveedor.")
            
    movimiento = MovimientoCaja(
        caja_diaria_id=caja.id,
        tenant_id=tenant.id,
        tipo=payload.tipo,
        monto=payload.monto,
        descripcion=payload.descripcion,
        usuario_id=current_user.id,
        empleado_id=payload.empleado_id,
        proveedor_nombre=payload.proveedor_nombre
    )
    
    db.add(movimiento)
    db.commit()
    db.refresh(movimiento)
    
    return movimiento

@router.get("/movimientos", response_model=List[MovimientoCajaResponse])
def list_movimientos_activos(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: Usuario = Depends(admin_or_staff)
):
    """
    Lists all transactions registered in the active cash box.
    """
    caja = db.query(CajaDiaria).filter(
        CajaDiaria.tenant_id == tenant.id,
        CajaDiaria.estado == "ABIERTA"
    ).first()
    
    if not caja:
        return []
        
    return db.query(MovimientoCaja).filter(
        MovimientoCaja.caja_diaria_id == caja.id
    ).order_by(MovimientoCaja.fecha.desc()).all()

@router.get("/historial", response_model=List[CajaDiariaResponse])
def get_historial_cajas(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: Usuario = Depends(admin_or_staff)
):
    """
    Lists historically closed cash registers.
    """
    cajas = db.query(CajaDiaria).filter(
        CajaDiaria.tenant_id == tenant.id,
        CajaDiaria.estado == "CERRADA"
    ).order_by(CajaDiaria.fecha_apertura.desc()).all()
    
    results = []
    for c in cajas:
        totals = compute_caja_totals(c, db)
        resp = CajaDiariaResponse.model_validate(c)
        resp.total_ingresos = totals["total_ingresos"]
        resp.total_egresos = totals["total_egresos"]
        resp.total_gastos = totals["total_gastos"]
        resp.saldo_calculado = totals["saldo_calculado"]
        results.append(resp)
        
    return results

@router.get("/empleados")
def get_empleados(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: Usuario = Depends(admin_or_staff)
):
    """
    Returns a simple list of employees (all users of the tenant except CLIENTE role).
    Useful to select employees when making salary advances/payments.
    """
    users = db.query(Usuario).filter(
        Usuario.tenant_id == tenant.id,
        Usuario.rol != "CLIENTE",
        Usuario.rol != "PLATFORM_ADMIN",
        Usuario.activo == True
    ).order_by(Usuario.nombre).all()
    
    return [{"id": u.id, "nombre": u.nombre, "email": u.email, "rol": u.rol} for u in users]

@router.get("/{caja_id}", response_model=CajaDiariaResponse)
def get_caja_detalle(
    caja_id: int,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: Usuario = Depends(admin_or_staff)
):
    """
    Gets details of a specific cash box by ID.
    """
    caja = db.query(CajaDiaria).filter(
        CajaDiaria.id == caja_id,
        CajaDiaria.tenant_id == tenant.id
    ).first()
    
    if not caja:
        raise HTTPException(status_code=404, detail="Registro de caja no encontrado.")
        
    totals = compute_caja_totals(caja, db)
    
    resp = CajaDiariaResponse.model_validate(caja)
    resp.total_ingresos = totals["total_ingresos"]
    resp.total_egresos = totals["total_egresos"]
    resp.total_gastos = totals["total_gastos"]
    resp.saldo_calculado = totals["saldo_calculado"]
    
    return resp
