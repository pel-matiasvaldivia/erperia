from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os

from app.core.database import get_db
from app.core.security import get_current_user, RoleChecker
from app.core.tenant import get_current_tenant
from app.models.tenant import Tenant
from app.models.listas_precios import ListaPrecios, ListaPreciosDetalle
from app.models.producto import Producto
from app.models.usuario import Usuario
from app.schemas.listas_precios import (
    ListaPreciosCreate, ListaPreciosUpdate, ListaPreciosResponse, 
    ListaPreciosDetalleUpdate, ListaPreciosDetalleResponse, 
    ListaPreciosConDetalles, BulkPriceUpdate
)
from app.utils.excel_manager import import_prices_from_excel, export_prices_to_excel
from app.core.config import settings

router = APIRouter(prefix="/listas-precios", tags=["Listas de Precios"])

# Permissions
superadmin_only = RoleChecker(["SUPERADMIN"])
read_access = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO", "VENDEDOR"])

@router.get("/", response_model=List[ListaPreciosResponse])
def list_listas_precios(
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(read_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Get all active price lists. Accessible to admin and staff.
    """
    return db.query(ListaPrecios).filter(ListaPrecios.tenant_id == tenant.id).all()

@router.get("/{lista_id}/detalles", response_model=ListaPreciosConDetalles)
def get_lista_detalles(
    lista_id: int, 
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(read_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Retrieve all product prices, stock, and details inside a specific pricing list.
    """
    lista = db.query(ListaPrecios).filter(ListaPrecios.id == lista_id, ListaPrecios.tenant_id == tenant.id).first()
    if not lista:
        raise HTTPException(status_code=404, detail="Lista de precios no encontrada")
    return lista

@router.post("/", response_model=ListaPreciosResponse)
def create_lista_precios(
    lista_in: ListaPreciosCreate, 
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(superadmin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Create a new pricing list (Superadmin only).
    """
    # Check if name is taken
    existing = db.query(ListaPrecios).filter(ListaPrecios.nombre == lista_in.nombre, ListaPrecios.tenant_id == tenant.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una lista con este nombre")
        
    new_lista = ListaPrecios(
        nombre=lista_in.nombre,
        descripcion=lista_in.descripcion,
        activa=lista_in.activa,
        tenant_id=tenant.id
    )
    db.add(new_lista)
    db.commit()
    db.refresh(new_lista)
    
    # Auto-populate details for all existing products of the tenant with $0.00
    all_products = db.query(Producto).filter(Producto.tenant_id == tenant.id).all()
    for prod in all_products:
        det = ListaPreciosDetalle(
            lista_precios_id=new_lista.id,
            producto_id=prod.id,
            precio_costo=0.0,
            precio_venta=0.0,
            precio_mayoreo=0.0,
            stock=0.0,
            stock_minimo=0.0
        )
        db.add(det)
    db.commit()
    
    return new_lista

@router.put("/{lista_id}", response_model=ListaPreciosResponse)
def update_lista_precios(
    lista_id: int, 
    lista_in: ListaPreciosUpdate, 
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(superadmin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Modify details of a price list (Superadmin only).
    """
    lista = db.query(ListaPrecios).filter(ListaPrecios.id == lista_id, ListaPrecios.tenant_id == tenant.id).first()
    if not lista:
        raise HTTPException(status_code=404, detail="Lista de precios no encontrada")
        
    for field, value in lista_in.model_dump(exclude_unset=True).items():
        setattr(lista, field, value)
        
    db.commit()
    db.refresh(lista)
    return lista

@router.delete("/{lista_id}")
def delete_lista_precios(
    lista_id: int, 
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(superadmin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Remove a pricing list (Superadmin only).
    """
    lista = db.query(ListaPrecios).filter(ListaPrecios.id == lista_id, ListaPrecios.tenant_id == tenant.id).first()
    if not lista:
        raise HTTPException(status_code=404, detail="Lista de precios no encontrada")
    db.delete(lista)
    db.commit()
    return {"detail": "Lista de precios eliminada exitosamente"}

@router.put("/{lista_id}/detalle/{detalle_id}", response_model=ListaPreciosDetalleResponse)
def update_detalle_precio(
    lista_id: int,
    detalle_id: int,
    detalle_in: ListaPreciosDetalleUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(superadmin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Edit cost, prices, or stock for a single item in a list (Superadmin only).
    """
    lista = db.query(ListaPrecios).filter(ListaPrecios.id == lista_id, ListaPrecios.tenant_id == tenant.id).first()
    if not lista:
        raise HTTPException(status_code=404, detail="Lista de precios no encontrada")

    det = db.query(ListaPreciosDetalle).filter(
        ListaPreciosDetalle.id == detalle_id,
        ListaPreciosDetalle.lista_precios_id == lista_id
    ).first()
    if not det:
        raise HTTPException(status_code=404, detail="Registro de detalle no encontrado")
        
    for field, value in detalle_in.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(det, field, value)
            
    db.commit()
    db.refresh(det)
    return det

@router.post("/importar")
async def importar_lista_excel(
    lista_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(superadmin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Upload an Excel file to bulk import or update prices and stocks (Superadmin only).
    """
    # Verify list exists and belongs to tenant
    lista = db.query(ListaPrecios).filter(ListaPrecios.id == lista_id, ListaPrecios.tenant_id == tenant.id).first()
    if not lista:
        raise HTTPException(status_code=404, detail="Lista de precios destino no existe")
        
    # Save file temporarily
    temp_dir = "/tmp" if os.name != 'nt' else settings.UPLOAD_DIR
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, file.filename)
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        count = import_prices_from_excel(db, temp_path, lista_id)
        return {"detail": f"Importación exitosa. Se actualizaron {count} productos."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al importar archivo Excel: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.get("/{lista_id}/exportar")
def exportar_lista_excel(
    lista_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(read_access),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Export current prices of a list to an Excel spreadsheet.
    Returns download link.
    """
    # Verify list exists and belongs to tenant
    lista = db.query(ListaPrecios).filter(ListaPrecios.id == lista_id, ListaPrecios.tenant_id == tenant.id).first()
    if not lista:
        raise HTTPException(status_code=404, detail="Lista de precios no encontrada")
        
    try:
        download_url = export_prices_to_excel(db, lista_id, settings.UPLOAD_DIR)
        return {"download_url": download_url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al exportar archivo: {str(e)}")

@router.post("/actualizar-masivo")
def actualizar_masivo_precios(
    params: BulkPriceUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(superadmin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Bulk price updates by percentage or fixed amount (Superadmin only).
    Optionally filters by product department/family.
    """
    lista = db.query(ListaPrecios).filter(ListaPrecios.id == params.lista_id, ListaPrecios.tenant_id == tenant.id).first()
    if not lista:
        raise HTTPException(status_code=404, detail="Lista de precios no encontrada")
        
    query = db.query(ListaPreciosDetalle).filter(ListaPreciosDetalle.lista_precios_id == params.lista_id)
    
    if params.departamento:
        query = query.join(Producto).filter(Producto.departamento == params.departamento, Producto.tenant_id == tenant.id)
        
    detalles = query.all()
    count = 0
    
    for det in detalles:
        if params.tipo_ajuste == "porcentaje":
            factor = 1 + (params.valor / 100.0)
            det.precio_venta = round(det.precio_venta * factor, 2)
            det.precio_mayoreo = round(det.precio_mayoreo * factor, 2)
        elif params.tipo_ajuste == "fijo":
            det.precio_venta = round(det.precio_venta + params.valor, 2)
            det.precio_mayoreo = round(det.precio_mayoreo + params.valor, 2)
        count += 1
        
    db.commit()
    return {"detail": f"Actualización masiva completa. Se modificaron {count} registros."}
