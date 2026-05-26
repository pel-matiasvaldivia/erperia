from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, RoleChecker, get_password_hash
from app.core.tenant import get_current_tenant
from app.models.tenant import Tenant
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.models.cuenta_corriente import CuentaCorriente
from app.schemas.cliente import ClienteCreate, ClienteUpdate, ClienteResponse

router = APIRouter(prefix="/clientes", tags=["Clientes"])

# Allowed roles: TENANT_ADMIN and ADMINISTRATIVO can do CRUD. VENDEDOR can read.
admin_or_staff = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO", "VENDEDOR"])
write_access = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO"])

@router.get("/", response_model=List[ClienteResponse])
def list_clientes(
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(admin_or_staff),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Get all clients. Admins and Salesmen can list clients.
    """
    return db.query(Cliente).filter(Cliente.tenant_id == tenant.id).all()

@router.get("/{cliente_id}", response_model=ClienteResponse)
def get_cliente(
    cliente_id: int, 
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(admin_or_staff),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Retrieve specific client by ID.
    """
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.tenant_id == tenant.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente

@router.post("/", response_model=ClienteResponse)
def create_cliente(
    cliente_in: ClienteCreate, 
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(write_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Create a new client. Initializes their accounts.
    If 'crear_usuario' is enabled, creates a Client user portal account.
    """
    # Check if CUIT already exists in this tenant
    if cliente_in.cuit:
        existing_cuit = db.query(Cliente).filter(Cliente.cuit == cliente_in.cuit, Cliente.tenant_id == tenant.id).first()
        if existing_cuit:
            raise HTTPException(status_code=400, detail="El CUIT ya está registrado")
            
    usuario_id = None
    if cliente_in.crear_usuario and cliente_in.email and cliente_in.password:
        # Check if email exists in this tenant
        existing_email = db.query(Usuario).filter(Usuario.email == cliente_in.email, Usuario.tenant_id == tenant.id).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="El email del usuario ya está registrado")
            
        new_user = Usuario(
            nombre=cliente_in.razon_social,
            email=cliente_in.email,
            password_hash=get_password_hash(cliente_in.password),
            rol="CLIENTE",
            tenant_id=tenant.id,
            activo=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        usuario_id = new_user.id

    new_cliente = Cliente(
        razon_social=cliente_in.razon_social,
        cuit=cliente_in.cuit,
        direccion=cliente_in.direccion,
        telefono_whatsapp=cliente_in.telefono_whatsapp,
        ruta_id=cliente_in.ruta_id,
        lista_precios_id=cliente_in.lista_precios_id,
        limite_credito=cliente_in.limite_credito,
        activo=cliente_in.activo,
        usuario_id=usuario_id if usuario_id else cliente_in.usuario_id,
        tenant_id=tenant.id
    )
    db.add(new_cliente)
    db.commit()
    db.refresh(new_cliente)
    
    # Initialize Cuenta Corriente account
    cc = CuentaCorriente(
        cliente_id=new_cliente.id,
        saldo_actual=0.0,
        limite_credito=new_cliente.limite_credito or 0.0,
        tenant_id=tenant.id
    )
    db.add(cc)
    db.commit()
    
    # Re-retrieve to populate relations
    return db.query(Cliente).filter(Cliente.id == new_cliente.id, Cliente.tenant_id == tenant.id).first()

@router.put("/{cliente_id}", response_model=ClienteResponse)
def update_cliente(
    cliente_id: int, 
    cliente_in: ClienteUpdate, 
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(write_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Update a client details. Updates credit limits on accounts.
    """
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.tenant_id == tenant.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
    # Update fields
    for field, value in cliente_in.model_dump(exclude_unset=True).items():
        setattr(cliente, field, value)
        
    db.commit()
    
    # Keep Credit limit synced with Cuenta Corriente
    if cliente.cuenta_corriente and cliente_in.limite_credito is not None:
        cliente.cuenta_corriente.limite_credito = cliente_in.limite_credito
        db.commit()
        
    db.refresh(cliente)
    return cliente

@router.delete("/{cliente_id}")
def delete_cliente(
    cliente_id: int, 
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(write_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Delete a client. Cleans related records.
    """
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.tenant_id == tenant.id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
    # If the client has a linked user account, delete it too
    if cliente.usuario_id:
        user = db.query(Usuario).filter(Usuario.id == cliente.usuario_id, Usuario.tenant_id == tenant.id).first()
        if user:
            db.delete(user)
            
    db.delete(cliente)
    db.commit()
    return {"detail": "Cliente eliminado exitosamente"}
