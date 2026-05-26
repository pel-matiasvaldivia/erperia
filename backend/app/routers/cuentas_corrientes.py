from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from app.core.database import get_db
from app.core.security import get_current_user, RoleChecker
from app.core.tenant import get_current_tenant
from app.models.tenant import Tenant
from app.models.cuenta_corriente import CuentaCorriente, MovimientoCC
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.schemas.cuenta_corriente import CuentaCorrienteResponse, RegistrarPagoRequest, MovimientoCCResponse

router = APIRouter(prefix="/cuentas-corrientes", tags=["Cuentas Corrientes"])

admin_staff = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO", "TENANT_ADMIN"])
read_access = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO", "CLIENTE", "TENANT_ADMIN"])


@router.get("/", response_model=List[dict])
def list_cuentas_corrientes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_staff),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Get all clients' credit balances for the current tenant.
    """
    cc_list = db.query(CuentaCorriente).filter(
        CuentaCorriente.tenant_id == tenant.id
    ).all()

    result = []
    for cc in cc_list:
        result.append({
            "id": cc.id,
            "cliente_id": cc.cliente_id,
            "cliente_razon_social": cc.cliente.razon_social,
            "cuit": cc.cliente.cuit,
            "saldo_actual": cc.saldo_actual,
            "limite_credito": cc.limite_credito,
            "fecha_actualizacion": cc.fecha_actualizacion,
            "supera_limite": cc.saldo_actual > cc.limite_credito
        })
    return result


@router.get("/cliente/{cliente_id}", response_model=CuentaCorrienteResponse)
def get_cuenta_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(read_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Fetch movements and balance of a specific client's account (tenant-scoped).
    Clients can only fetch their own accounts.
    """
    if current_user.rol == "CLIENTE":
        cliente = db.query(Cliente).filter(
            Cliente.usuario_id == current_user.id,
            Cliente.tenant_id == tenant.id
        ).first()
        if not cliente or cliente.id != cliente_id:
            raise HTTPException(status_code=403, detail="No autorizado para ver esta cuenta corriente")

    cc = db.query(CuentaCorriente).filter(
        CuentaCorriente.cliente_id == cliente_id,
        CuentaCorriente.tenant_id == tenant.id
    ).first()
    if not cc:
        raise HTTPException(status_code=404, detail="Cuenta corriente no encontrada")

    return cc


@router.post("/cliente/{cliente_id}/pagar", response_model=MovimientoCCResponse)
def registrar_pago(
    cliente_id: int,
    payload: RegistrarPagoRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_staff),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Post a payment (CREDITO) to a client's account (tenant-scoped).
    """
    cc = db.query(CuentaCorriente).filter(
        CuentaCorriente.cliente_id == cliente_id,
        CuentaCorriente.tenant_id == tenant.id
    ).first()
    if not cc:
        raise HTTPException(status_code=404, detail="Cuenta corriente no encontrada")

    cc.saldo_actual = round(cc.saldo_actual - payload.monto, 2)
    cc.fecha_actualizacion = datetime.datetime.utcnow()

    ref = payload.referencia or "S/R"
    desc = payload.descripcion or f"Pago recibido - {payload.tipo_pago}"

    mov = MovimientoCC(
        tenant_id=tenant.id,
        cuenta_id=cc.id,
        tipo="CREDITO",
        monto=payload.monto,
        referencia=ref,
        fecha=datetime.datetime.utcnow(),
        descripcion=desc
    )
    db.add(mov)
    db.commit()
    db.refresh(mov)
    return mov


@router.patch("/cliente/{cliente_id}/limite-credito", response_model=dict)
def update_limite_credito(
    cliente_id: int,
    nuevo_limite: float,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_staff),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Update the credit limit for a specific client (tenant-scoped).
    """
    cc = db.query(CuentaCorriente).filter(
        CuentaCorriente.cliente_id == cliente_id,
        CuentaCorriente.tenant_id == tenant.id
    ).first()
    if not cc:
        raise HTTPException(status_code=404, detail="Cuenta corriente no encontrada")

    cc.limite_credito = nuevo_limite
    db.commit()
    return {"status": "ok", "nuevo_limite": cc.limite_credito}


@router.get("/resumen-morosidad")
def get_resumen_morosidad(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_staff),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Get summary of clients exceeding their credit limit (tenant-scoped).
    """
    cc_morosos = db.query(CuentaCorriente).filter(
        CuentaCorriente.tenant_id == tenant.id,
        CuentaCorriente.saldo_actual > CuentaCorriente.limite_credito
    ).all()

    return {
        "total_morosos": len(cc_morosos),
        "clientes": [
            {
                "cliente_id": cc.cliente_id,
                "razon_social": cc.cliente.razon_social,
                "saldo_actual": cc.saldo_actual,
                "limite_credito": cc.limite_credito,
                "exceso": round(cc.saldo_actual - cc.limite_credito, 2)
            }
            for cc in cc_morosos
        ]
    }
