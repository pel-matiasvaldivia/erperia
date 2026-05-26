from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, RoleChecker
from app.core.tenant import get_current_tenant
from app.models.tenant import Tenant
from app.models.configuracion import ConfiguracionSistema
from app.models.usuario import Usuario
from app.models.cliente import Cliente
from app.models.ruta import Ruta
from app.models.listas_precios import ListaPrecios, ListaPreciosDetalle
from app.models.producto import Producto
from app.models.pedido import Pedido, PedidoItem
from app.models.preparacion import OrdenPreparacion, OrdenPreparacionBulto
from app.models.comprobante import Comprobante
from app.models.cuenta_corriente import CuentaCorriente, MovimientoCC
from app.models.caja import CajaDiaria, MovimientoCaja
from app.schemas.configuracion import ConfiguracionSistemaResponse, ConfiguracionSistemaUpdate

router = APIRouter(prefix="/configuracion", tags=["Configuración del Sistema"])

tenant_admin_only = RoleChecker(["SUPERADMIN", "TENANT_ADMIN"])
all_authenticated = RoleChecker(["SUPERADMIN", "ADMINISTRATIVO", "VENDEDOR", "REPARTIDOR", "CLIENTE", "TENANT_ADMIN"])


@router.get("/empresa")
def get_empresa_details(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Get enterprise metadata from the current tenant's record.
    This replaces the old hardcoded config.py approach — all data is tenant-specific.
    """
    return {
        "nombre": tenant.razon_social,
        "nombre_fantasia": tenant.nombre_fantasia,
        "cuit": tenant.cuit,
        "direccion": tenant.direccion,
        "ciudad": tenant.ciudad,
        "provincia": tenant.provincia,
        "telefono": tenant.telefono,
        "email": tenant.email,
        "condicion_iva": tenant.condicion_iva,
        "logo_url": tenant.logo_url,
        "color_primario": tenant.color_primario,
        "plan": tenant.plan,
        # WhatsApp bot phone number for this tenant
        "whatsapp_numero": getattr(tenant, 'whatsapp_numero', None),
        "whatsapp_activo": getattr(tenant, 'whatsapp_activo', False),
    }


@router.get("/", response_model=List[ConfiguracionSistemaResponse])
def list_configuraciones(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(tenant_admin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Get all system configurations for the current tenant.
    """
    return db.query(ConfiguracionSistema).filter(
        ConfiguracionSistema.tenant_id == tenant.id
    ).all()


@router.put("/{clave}", response_model=ConfiguracionSistemaResponse)
def update_configuracion(
    clave: str,
    payload: ConfiguracionSistemaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(tenant_admin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Modify a configuration parameter for the current tenant.
    """
    config = db.query(ConfiguracionSistema).filter(
        ConfiguracionSistema.clave == clave,
        ConfiguracionSistema.tenant_id == tenant.id
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Parámetro de configuración no encontrado")

    config.valor = payload.valor
    db.commit()
    db.refresh(config)
    return config


@router.post("/{clave}")
def create_or_update_configuracion(
    clave: str,
    payload: ConfiguracionSistemaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(tenant_admin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Create or update a configuration parameter for the current tenant.
    """
    config = db.query(ConfiguracionSistema).filter(
        ConfiguracionSistema.clave == clave,
        ConfiguracionSistema.tenant_id == tenant.id
    ).first()

    if config:
        config.valor = payload.valor
    else:
        config = ConfiguracionSistema(
            tenant_id=tenant.id,
            clave=clave,
            valor=payload.valor,
            descripcion=f"Configuración {clave}"
        )
        db.add(config)

    db.commit()
    db.refresh(config)
    return {"clave": config.clave, "valor": config.valor, "status": "ok"}


@router.patch("/tenant/branding")
def update_tenant_branding(
    logo_url: str = None,
    color_primario: str = None,
    nombre_fantasia: str = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(tenant_admin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Update branding settings (logo, color, fantasy name) for the current tenant.
    """
    if logo_url is not None:
        tenant.logo_url = logo_url
    if color_primario is not None:
        tenant.color_primario = color_primario
    if nombre_fantasia is not None:
        tenant.nombre_fantasia = nombre_fantasia

    db.commit()
    db.refresh(tenant)
    return {
        "status": "ok",
        "logo_url": tenant.logo_url,
        "color_primario": tenant.color_primario,
        "nombre_fantasia": tenant.nombre_fantasia
    }


@router.delete("/tenant/purge-self")
def purge_self_tenant(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(tenant_admin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Transactional cascade self-destruction/deletion of the current tenant and all its data.
    Accessible only to the TENANT_ADMIN / SUPERADMIN.
    """
    if tenant.id == 1:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar el tenant demo/por defecto (ID 1)."
        )
        
    try:
        # 1. MovimientoCaja
        db.query(MovimientoCaja).filter(MovimientoCaja.tenant_id == tenant.id).delete(synchronize_session=False)
        
        # 2. CajaDiaria
        db.query(CajaDiaria).filter(CajaDiaria.tenant_id == tenant.id).delete(synchronize_session=False)
        
        # 3. MovimientoCC
        db.query(MovimientoCC).filter(MovimientoCC.tenant_id == tenant.id).delete(synchronize_session=False)
        
        # 4. CuentaCorriente
        db.query(CuentaCorriente).filter(CuentaCorriente.tenant_id == tenant.id).delete(synchronize_session=False)
        
        # 5. Comprobante
        db.query(Comprobante).filter(Comprobante.tenant_id == tenant.id).delete(synchronize_session=False)
        
        # 6. OrdenPreparacionBulto (no tiene tenant_id, borrar vía OrdenPreparacion)
        db.query(OrdenPreparacionBulto).filter(
            OrdenPreparacionBulto.orden_id.in_(
                db.query(OrdenPreparacion.id).filter(OrdenPreparacion.tenant_id == tenant.id)
            )
        ).delete(synchronize_session=False)
        
        # 7. OrdenPreparacion
        db.query(OrdenPreparacion).filter(OrdenPreparacion.tenant_id == tenant.id).delete(synchronize_session=False)
        
        # 8. PedidoItem (no tiene tenant_id, borrar vía Pedido)
        db.query(PedidoItem).filter(
            PedidoItem.pedido_id.in_(
                db.query(Pedido.id).filter(Pedido.tenant_id == tenant.id)
            )
        ).delete(synchronize_session=False)
        
        # 9. Pedido
        db.query(Pedido).filter(Pedido.tenant_id == tenant.id).delete(synchronize_session=False)
        
        # 10. Desvincular rutas y clientes
        db.query(Cliente).filter(Cliente.tenant_id == tenant.id).update({Cliente.ruta_id: None}, synchronize_session=False)
        db.query(Ruta).filter(Ruta.tenant_id == tenant.id).update({Ruta.repartidor_id: None}, synchronize_session=False)
        db.query(Ruta).filter(Ruta.tenant_id == tenant.id).delete(synchronize_session=False)
        
        # 11. ListaPreciosDetalle (no tiene tenant_id, borrar vía ListaPrecios)
        db.query(ListaPreciosDetalle).filter(
            ListaPreciosDetalle.lista_precios_id.in_(
                db.query(ListaPrecios.id).filter(ListaPrecios.tenant_id == tenant.id)
            )
        ).delete(synchronize_session=False)
        
        # 12. ListaPrecios
        db.query(Cliente).filter(Cliente.tenant_id == tenant.id).update({Cliente.lista_precios_id: None}, synchronize_session=False)
        db.query(ListaPrecios).filter(ListaPrecios.tenant_id == tenant.id).delete(synchronize_session=False)
        
        # 13. Producto
        db.query(Producto).filter(Producto.tenant_id == tenant.id).delete(synchronize_session=False)
        
        # 14. Cliente
        db.query(Cliente).filter(Cliente.tenant_id == tenant.id).update({Cliente.usuario_id: None}, synchronize_session=False)
        db.query(Cliente).filter(Cliente.tenant_id == tenant.id).delete(synchronize_session=False)
        
        # 15. Usuario
        db.query(Usuario).filter(Usuario.tenant_id == tenant.id).delete(synchronize_session=False)
        
        # 16. ConfiguracionSistema
        db.query(ConfiguracionSistema).filter(ConfiguracionSistema.tenant_id == tenant.id).delete(synchronize_session=False)
        
        # 17. Tenant
        db.query(Tenant).filter(Tenant.id == tenant.id).delete(synchronize_session=False)
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error al eliminar el tenant y sus dependencias: {str(e)}"
        )
        
    return {"message": "Tenant y todos sus datos relacionados eliminados exitosamente"}
