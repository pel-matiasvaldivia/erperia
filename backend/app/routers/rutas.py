from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, RoleChecker
from app.core.tenant import get_current_tenant
from app.models.tenant import Tenant
from app.models.ruta import Ruta
from app.models.usuario import Usuario
from app.schemas.ruta import RutaCreate, RutaUpdate, RutaResponse

router = APIRouter(prefix="/rutas", tags=["Rutas de Reparto"])

admin_staff = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO", "TENANT_ADMIN"])
read_access = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO", "VENDEDOR", "REPARTIDOR", "TENANT_ADMIN"])


@router.get("/", response_model=List[RutaResponse])
def list_rutas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(read_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Get all delivery routes for the current tenant.
    """
    return db.query(Ruta).filter(Ruta.tenant_id == tenant.id).all()


@router.get("/{ruta_id}", response_model=RutaResponse)
def get_ruta(
    ruta_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(read_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Get route detail by ID (tenant-scoped).
    """
    ruta = db.query(Ruta).filter(
        Ruta.id == ruta_id,
        Ruta.tenant_id == tenant.id
    ).first()
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    return ruta


@router.post("/", response_model=RutaResponse)
def create_ruta(
    ruta_in: RutaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_staff),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Create a new delivery route for the current tenant.
    """
    new_ruta = Ruta(
        tenant_id=tenant.id,
        nombre=ruta_in.nombre,
        zona=ruta_in.zona,
        dias_reparto=ruta_in.dias_reparto,
        repartidor_id=ruta_in.repartidor_id
    )
    db.add(new_ruta)
    db.commit()
    db.refresh(new_ruta)
    return new_ruta


@router.put("/{ruta_id}", response_model=RutaResponse)
def update_ruta(
    ruta_id: int,
    ruta_in: RutaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_staff),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Modify an existing delivery route (tenant-scoped).
    """
    ruta = db.query(Ruta).filter(
        Ruta.id == ruta_id,
        Ruta.tenant_id == tenant.id
    ).first()
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")

    for field, value in ruta_in.model_dump(exclude_unset=True).items():
        setattr(ruta, field, value)

    db.commit()
    db.refresh(ruta)
    return ruta


@router.delete("/{ruta_id}")
def delete_ruta(
    ruta_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_staff),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Delete a delivery route (tenant-scoped).
    """
    ruta = db.query(Ruta).filter(
        Ruta.id == ruta_id,
        Ruta.tenant_id == tenant.id
    ).first()
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    db.delete(ruta)
    db.commit()
    return {"detail": "Ruta eliminada exitosamente"}
