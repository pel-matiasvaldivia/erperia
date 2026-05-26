import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db, SessionLocal
from app.core.security import RoleChecker
from app.core.tenant import get_current_tenant
from app.models.cliente import Cliente
from app.models.tenant import Tenant
from app.models.ruta import Ruta
from app.services.geocoding import GeocodingService

router = APIRouter(prefix="/geo", tags=["Geolocalización"])
admin_access = RoleChecker(["PLATFORM_ADMIN", "TENANT_ADMIN", "ADMINISTRATIVO"])

async def geocodificar_masivo(db_session_factory, tenant_id: int):
    db = db_session_factory()
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            return
            
        clientes = db.query(Cliente).filter(
            Cliente.tenant_id == tenant_id,
            Cliente.geocodificado == False,
            Cliente.activo == True
        ).all()
        
        for c in clientes:
            coords = await GeocodingService.geocode_address(
                c.direccion, 
                ciudad=tenant.ciudad or "", 
                pais=tenant.pais
            )
            if coords:
                c.latitud = str(coords[0])
                c.longitud = str(coords[1])
                c.geocodificado = True
                db.commit()
            await asyncio.sleep(0.1)  # Sleep 100ms to respect rate limits
    except Exception as e:
        print(f"Error in mass geocoding: {e}")
    finally:
        db.close()

@router.post("/geocodificar-cliente/{cliente_id}")
async def geocodificar_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    _=Depends(admin_access)
):
    """Geocodifica la dirección de un cliente específico."""
    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id, 
        Cliente.tenant_id == tenant.id
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    coords = await GeocodingService.geocode_address(
        cliente.direccion, 
        ciudad=tenant.ciudad or "", 
        pais=tenant.pais
    )
    
    if coords:
        cliente.latitud = str(coords[0])
        cliente.longitud = str(coords[1])
        cliente.geocodificado = True
        db.commit()
        return {"geocodificado": True, "latitud": coords[0], "longitud": coords[1]}
    
    raise HTTPException(status_code=400, detail="No se pudo geocodificar la dirección de este cliente")

@router.post("/geocodificar-todos")
async def geocodificar_todos_los_clientes(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    _=Depends(admin_access)
):
    """Lanza geocodificación masiva de todos los clientes del tenant en background."""
    background_tasks.add_task(geocodificar_masivo, SessionLocal, tenant.id)
    return {"message": "Geocodificación iniciada en background"}

@router.post("/optimizar-ruta/{ruta_id}")
async def optimizar_ruta(
    ruta_id: int,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
    _=Depends(admin_access)
):
    """
    Optimiza el orden de visita de los clientes de una ruta.
    Usa el depósito del tenant como origen/destino.
    """
    ruta = db.query(Ruta).filter(Ruta.id == ruta_id, Ruta.tenant_id == tenant.id).first()
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    
    clientes = db.query(Cliente).filter(
        Cliente.ruta_id == ruta_id,
        Cliente.tenant_id == tenant.id,
        Cliente.geocodificado == True,
        Cliente.activo == True
    ).all()
    
    if len(clientes) < 2:
        raise HTTPException(status_code=400, detail="Se necesitan al menos 2 clientes geocodificados para optimizar la ruta")
    
    if not tenant.latitud or not tenant.longitud:
        # Intenta geocodificar la dirección del tenant primero
        tenant_coords = await GeocodingService.geocode_address(tenant.direccion, tenant.ciudad or "", tenant.pais)
        if tenant_coords:
            tenant.latitud = str(tenant_coords[0])
            tenant.longitud = str(tenant_coords[1])
            tenant.geocodificado = True
            db.commit()
        else:
            raise HTTPException(status_code=400, detail="El depósito del tenant no tiene coordenadas válidas. Por favor configure y geocodifique la dirección del tenant.")
    
    origin = (float(tenant.latitud), float(tenant.longitud))
    waypoints = [(float(c.latitud), float(c.longitud)) for c in clientes]
    
    result = await GeocodingService.optimize_route(origin, waypoints)
    
    # El orden devuelto por optimize_route corresponde a los índices en waypoints
    # Guardamos la posición reordenada en cada cliente
    waypoint_order = result["waypoint_order"]
    for new_pos, original_idx in enumerate(waypoint_order):
        if original_idx < len(clientes):
            clientes[original_idx].orden_ruta = new_pos
    
    ruta.waypoints_geojson = str(result)
    ruta.distancia_total_km = result["total_distance_km"]
    ruta.tiempo_estimado_min = result["total_duration_min"]
    
    db.commit()
    
    clientes_ordenados = sorted(clientes, key=lambda c: c.orden_ruta if c.orden_ruta is not None else 9999)
    
    return {
        "ruta_id": ruta_id,
        "clientes_ordenados": [
            {
                "id": c.id, 
                "razon_social": c.razon_social, 
                "direccion": c.direccion, 
                "latitud": c.latitud, 
                "longitud": c.longitud,
                "orden": c.orden_ruta
            } 
            for c in clientes_ordenados
        ],
        "distancia_total_km": result["total_distance_km"],
        "tiempo_estimado_min": result["total_duration_min"],
        "polyline": result["polyline"]
    }

@router.get("/mapa-ruta/{ruta_id}")
async def get_mapa_ruta(
    ruta_id: int,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant)
):
    """Retorna todos los puntos de la ruta para renderizar en el mapa."""
    ruta = db.query(Ruta).filter(Ruta.id == ruta_id, Ruta.tenant_id == tenant.id).first()
    if not ruta:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
        
    clientes = db.query(Cliente).filter(
        Cliente.ruta_id == ruta_id,
        Cliente.tenant_id == tenant.id,
        Cliente.activo == True
    ).order_by(Cliente.orden_ruta).all()
    
    return {
        "tenant": {
            "id": tenant.id,
            "razon_social": tenant.razon_social,
            "lat": tenant.latitud,
            "lng": tenant.longitud,
            "direccion": tenant.direccion
        },
        "clientes": [
            {
                "id": c.id, 
                "razon_social": c.razon_social, 
                "direccion": c.direccion,
                "lat": c.latitud, 
                "lng": c.longitud, 
                "geocodificado": c.geocodificado,
                "orden": c.orden_ruta
            } 
            for c in clientes
        ],
        "distancia_total_km": ruta.distancia_total_km,
        "tiempo_estimado_min": ruta.tiempo_estimado_min,
        "waypoints_geojson": ruta.waypoints_geojson
    }
