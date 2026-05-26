from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.tenant import Tenant
from app.models.usuario import Usuario
from app.core.security import get_current_user

def get_current_tenant(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Tenant:
    """
    Extracts the tenant of the authenticated user.
    PLATFORM_ADMIN has no tenant_id (none/null) and acts on platform level.
    """
    if current_user.rol == "PLATFORM_ADMIN":
        return None  # No tenant restrictions (access to platform operations)
    
    if not current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Usuario sin tenant asignado")
    
    tenant = db.query(Tenant).filter(
        Tenant.id == current_user.tenant_id,
        Tenant.activo == True
    ).first()
    
    if not tenant:
        raise HTTPException(status_code=403, detail="Tenant inactivo o no encontrado")
    
    return tenant
