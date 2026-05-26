import os
import re
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, RoleChecker, create_access_token, get_password_hash
from app.core.config import settings
from app.models.tenant import Tenant
from app.models.usuario import Usuario
from app.models.cliente import Cliente
from app.models.pedido import Pedido, PedidoItem
from app.models.ruta import Ruta
from app.models.listas_precios import ListaPrecios, ListaPreciosDetalle
from app.models.producto import Producto
from app.models.preparacion import OrdenPreparacion, OrdenPreparacionBulto
from app.models.comprobante import Comprobante
from app.models.cuenta_corriente import CuentaCorriente, MovimientoCC
from app.models.configuracion import ConfiguracionSistema
from app.models.caja import CajaDiaria, MovimientoCaja
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse, TenantStatsResponse
from app.schemas.usuario import UsuarioResponse, UsuarioCreate
from app.db.seed import seed_tenant_data

router = APIRouter(prefix="/platform", tags=["Platform Admin"])
platform_only = RoleChecker(["PLATFORM_ADMIN"])

def generate_slug(text: str) -> str:
    # Lowercase, replace non-alphanumeric with hyphen
    s = text.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')

@router.get("/tenants", response_model=List[TenantResponse])
def list_tenants(db: Session = Depends(get_db), _=Depends(platform_only)):
    return db.query(Tenant).all()

@router.post("/tenants", response_model=TenantResponse)
def create_tenant(tenant_in: TenantCreate, db: Session = Depends(get_db), _=Depends(platform_only)):
    # Validate CUIT unique
    existing_cuit = db.query(Tenant).filter(Tenant.cuit == tenant_in.cuit).first()
    if existing_cuit:
        raise HTTPException(status_code=400, detail="CUIT ya registrado en la plataforma")
        
    slug = generate_slug(tenant_in.razon_social)
    # Check if slug exists, if so append random/index
    base_slug = slug
    counter = 1
    while db.query(Tenant).filter(Tenant.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
        
    tenant = Tenant(
        slug=slug,
        razon_social=tenant_in.razon_social,
        nombre_fantasia=tenant_in.nombre_fantasia,
        cuit=tenant_in.cuit,
        direccion=tenant_in.direccion,
        ciudad=tenant_in.ciudad,
        provincia=tenant_in.provincia,
        pais=tenant_in.pais,
        codigo_postal=tenant_in.codigo_postal,
        telefono=tenant_in.telefono,
        email=tenant_in.email,
        condicion_iva=tenant_in.condicion_iva,
        color_primario=tenant_in.color_primario,
        plan=tenant_in.plan,
        activo=True
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    
    # Run seed data for new tenant
    try:
        seed_tenant_data(db, tenant.id)
    except Exception as e:
        print(f"Error seeding data for new tenant {tenant.id}: {e}")
        
    return tenant

@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
def get_tenant(tenant_id: int, db: Session = Depends(get_db), _=Depends(platform_only)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    return tenant

@router.put("/tenants/{tenant_id}", response_model=TenantResponse)
def update_tenant(tenant_id: int, tenant_in: TenantUpdate, db: Session = Depends(get_db), _=Depends(platform_only)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
        
    for k, v in tenant_in.model_dump(exclude_unset=True).items():
        setattr(tenant, k, v)
        
    db.commit()
    db.refresh(tenant)
    return tenant

@router.delete("/tenants/{tenant_id}")
def delete_tenant(tenant_id: int, db: Session = Depends(get_db), _=Depends(platform_only)):
    if tenant_id == 1:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar el tenant demo/por defecto (ID 1)."
        )
        
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
        
    try:
        # 1. MovimientoCaja
        db.query(MovimientoCaja).filter(MovimientoCaja.tenant_id == tenant_id).delete(synchronize_session=False)
        
        # 2. CajaDiaria
        db.query(CajaDiaria).filter(CajaDiaria.tenant_id == tenant_id).delete(synchronize_session=False)
        
        # 3. MovimientoCC
        db.query(MovimientoCC).filter(MovimientoCC.tenant_id == tenant_id).delete(synchronize_session=False)
        
        # 4. CuentaCorriente
        db.query(CuentaCorriente).filter(CuentaCorriente.tenant_id == tenant_id).delete(synchronize_session=False)
        
        # 5. Comprobante
        db.query(Comprobante).filter(Comprobante.tenant_id == tenant_id).delete(synchronize_session=False)
        
        # 6. OrdenPreparacionBulto (no tiene tenant_id, borrar vía OrdenPreparacion)
        db.query(OrdenPreparacionBulto).filter(
            OrdenPreparacionBulto.orden_id.in_(
                db.query(OrdenPreparacion.id).filter(OrdenPreparacion.tenant_id == tenant_id)
            )
        ).delete(synchronize_session=False)
        
        # 7. OrdenPreparacion
        db.query(OrdenPreparacion).filter(OrdenPreparacion.tenant_id == tenant_id).delete(synchronize_session=False)
        
        # 8. PedidoItem (no tiene tenant_id, borrar vía Pedido)
        db.query(PedidoItem).filter(
            PedidoItem.pedido_id.in_(
                db.query(Pedido.id).filter(Pedido.tenant_id == tenant_id)
            )
        ).delete(synchronize_session=False)
        
        # 9. Pedido
        db.query(Pedido).filter(Pedido.tenant_id == tenant_id).delete(synchronize_session=False)
        
        # 10. Desvincular rutas y clientes
        db.query(Cliente).filter(Cliente.tenant_id == tenant_id).update({Cliente.ruta_id: None}, synchronize_session=False)
        db.query(Ruta).filter(Ruta.tenant_id == tenant_id).update({Ruta.repartidor_id: None}, synchronize_session=False)
        db.query(Ruta).filter(Ruta.tenant_id == tenant_id).delete(synchronize_session=False)
        
        # 11. ListaPreciosDetalle (no tiene tenant_id, borrar vía ListaPrecios)
        db.query(ListaPreciosDetalle).filter(
            ListaPreciosDetalle.lista_precios_id.in_(
                db.query(ListaPrecios.id).filter(ListaPrecios.tenant_id == tenant_id)
            )
        ).delete(synchronize_session=False)
        
        # 12. ListaPrecios
        db.query(Cliente).filter(Cliente.tenant_id == tenant_id).update({Cliente.lista_precios_id: None}, synchronize_session=False)
        db.query(ListaPrecios).filter(ListaPrecios.tenant_id == tenant_id).delete(synchronize_session=False)
        
        # 13. Producto
        db.query(Producto).filter(Producto.tenant_id == tenant_id).delete(synchronize_session=False)
        
        # 14. Cliente
        db.query(Cliente).filter(Cliente.tenant_id == tenant_id).update({Cliente.usuario_id: None}, synchronize_session=False)
        db.query(Cliente).filter(Cliente.tenant_id == tenant_id).delete(synchronize_session=False)
        
        # 15. Usuario
        db.query(Usuario).filter(Usuario.tenant_id == tenant_id).delete(synchronize_session=False)
        
        # 16. ConfiguracionSistema
        db.query(ConfiguracionSistema).filter(ConfiguracionSistema.tenant_id == tenant_id).delete(synchronize_session=False)
        
        # 17. Tenant
        db.query(Tenant).filter(Tenant.id == tenant_id).delete(synchronize_session=False)
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error al eliminar el tenant y sus dependencias: {str(e)}"
        )
        
    return {"message": "Tenant y todos sus datos relacionados eliminados exitosamente"}

@router.post("/tenants/{tenant_id}/logo")
async def upload_tenant_logo(
    tenant_id: int, 
    file: UploadFile = File(...),
    db: Session = Depends(get_db), 
    _=Depends(platform_only)
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
        
    # Guardar en UPLOAD_DIR/tenants/{tenant_id}/logo.ext
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.png', '.jpg', '.jpeg', '.gif']:
        raise HTTPException(status_code=400, detail="Formato de imagen inválido. Solo se admiten JPG, PNG, GIF.")
        
    tenant_dir = os.path.join(settings.UPLOAD_DIR, "tenants", str(tenant_id))
    os.makedirs(tenant_dir, exist_ok=True)
    
    logo_filename = f"logo{ext}"
    logo_path = os.path.join(tenant_dir, logo_filename)
    
    with open(logo_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    # Guardar URL pública
    tenant.logo_url = f"/api/uploads/tenants/{tenant_id}/{logo_filename}"
    db.commit()
    db.refresh(tenant)
    return {"logo_url": tenant.logo_url}

@router.get("/tenants/{tenant_id}/stats", response_model=TenantStatsResponse)
def get_tenant_stats(tenant_id: int, db: Session = Depends(get_db), _=Depends(platform_only)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
        
    total_usuarios = db.query(Usuario).filter(Usuario.tenant_id == tenant_id).count()
    total_clientes = db.query(Cliente).filter(Cliente.tenant_id == tenant_id).count()
    total_clientes_geolocalizados = db.query(Cliente).filter(
        Cliente.tenant_id == tenant_id, 
        Cliente.geocodificado == True
    ).count()
    
    # Pedidos este mes
    first_day_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    pedidos_este_mes = db.query(Pedido).filter(
        Pedido.tenant_id == tenant_id,
        Pedido.fecha >= first_day_of_month
    ).count()
    
    pedidos_total = db.query(Pedido).filter(Pedido.tenant_id == tenant_id).count()
    
    ultimo_pedido_obj = db.query(Pedido).filter(Pedido.tenant_id == tenant_id).order_by(Pedido.fecha.desc()).first()
    ultimo_pedido = ultimo_pedido_obj.fecha if ultimo_pedido_obj else None
    
    return TenantStatsResponse(
        tenant_id=tenant_id,
        total_usuarios=total_usuarios,
        total_clientes=total_clientes,
        total_clientes_geolocalizados=total_clientes_geolocalizados,
        pedidos_este_mes=pedidos_este_mes,
        pedidos_total=pedidos_total,
        ultimo_pedido=ultimo_pedido
    )

# ── Gestión de Usuarios por Tenant ──────────────────────────────

@router.get("/tenants/{tenant_id}/usuarios", response_model=List[UsuarioResponse])
def list_tenant_users(tenant_id: int, db: Session = Depends(get_db), _=Depends(platform_only)):
    return db.query(Usuario).filter(Usuario.tenant_id == tenant_id).all()

@router.post("/tenants/{tenant_id}/usuarios", response_model=UsuarioResponse)
def create_tenant_admin(
    tenant_id: int, 
    user_in: UsuarioCreate, 
    db: Session = Depends(get_db), 
    _=Depends(platform_only)
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
        
    existing_user = db.query(Usuario).filter(Usuario.email == user_in.email, Usuario.tenant_id == tenant_id).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado para este tenant")
        
    new_user = Usuario(
        nombre=user_in.nombre,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        rol=user_in.rol,
        tenant_id=tenant_id,
        activo=user_in.activo
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.patch("/tenants/{tenant_id}/usuarios/{user_id}/toggle")
def toggle_user_active(tenant_id: int, user_id: int, db: Session = Depends(get_db), _=Depends(platform_only)):
    user = db.query(Usuario).filter(Usuario.id == user_id, Usuario.tenant_id == tenant_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado en este tenant")
        
    user.activo = not user.activo
    db.commit()
    db.refresh(user)
    return {"id": user.id, "activo": user.activo}

@router.delete("/tenants/{tenant_id}/usuarios/{user_id}")
def delete_tenant_user(tenant_id: int, user_id: int, db: Session = Depends(get_db), _=Depends(platform_only)):
    user = db.query(Usuario).filter(Usuario.id == user_id, Usuario.tenant_id == tenant_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado en este tenant")
        
    db.delete(user)
    db.commit()
    return {"message": "Usuario eliminado exitosamente"}

# ── Impersonación (para soporte técnico) ────────────────────────

@router.post("/tenants/{tenant_id}/impersonate")
def impersonate_tenant(tenant_id: int, db: Session = Depends(get_db), _=Depends(platform_only)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
        
    # Buscamos un usuario TENANT_ADMIN para impersonar
    admin_user = db.query(Usuario).filter(
        Usuario.tenant_id == tenant_id,
        Usuario.rol == "TENANT_ADMIN"
    ).first()
    
    if not admin_user:
        raise HTTPException(status_code=404, detail="No hay administrador (TENANT_ADMIN) registrado para este tenant")
        
    # Genera un JWT temporal (15 min)
    token = create_access_token(subject=admin_user.id, expires_delta=timedelta(minutes=15))
    return {"access_token": token, "token_type": "bearer", "expires_in": 900}
