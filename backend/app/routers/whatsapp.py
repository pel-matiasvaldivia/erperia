import httpx
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict

from app.core.database import get_db
from app.core.config import settings
from app.models.cliente import Cliente
from app.models.pedido import Pedido, PedidoItem
from app.models.producto import Producto
from app.models.listas_precios import ListaPreciosDetalle
from app.models.tenant import Tenant
from app.services.ai_order import parse_whatsapp_order

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class WhatsAppMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_number: str = Field(..., alias="from")
    body: str = ""
    tenant_id: Optional[int] = None     # ← el bot lo resuelve previamente
    sender: Optional[Any] = None
    timestamp: Optional[Any] = None


# ─── Seguridad interna bot ───────────────────────────────────────────────────

def verify_bot_secret(x_bot_secret: Optional[str] = Header(None)):
    """
    Valida que la llamada provenga del bot WhatsApp interno usando un header secreto.
    Configurable en settings / env: BOT_SECRET
    """
    expected = getattr(settings, 'BOT_SECRET', 'frigo-bot-secret')
    if x_bot_secret != expected:
        raise HTTPException(status_code=403, detail="Bot secret inválido")
    return True


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/tenants-config")
def get_tenants_whatsapp_config(
    db: Session = Depends(get_db),
    _: bool = Depends(verify_bot_secret)
):
    """
    Endpoint exclusivo para el bot: devuelve todos los tenants con WhatsApp activo.
    El bot llama a este endpoint al arrancar para saber qué sesiones inicializar.
    """
    tenants = db.query(Tenant).filter(
        Tenant.activo == True,
        Tenant.whatsapp_activo == True,
        Tenant.whatsapp_numero != None
    ).all()

    return [
        {
            "id": t.id,
            "slug": t.slug,
            "whatsapp_numero": t.whatsapp_numero,
            "whatsapp_activo": t.whatsapp_activo,
            "razon_social": t.razon_social
        }
        for t in tenants
    ]


@router.post("/webhook")
async def whatsapp_webhook(msg: WhatsAppMessage, db: Session = Depends(get_db)):
    """
    Webhook que recibe mensajes del bot WhatsApp.
    El bot ya envía el tenant_id resuelto → no necesitamos buscar por número.
    Fallback: si no hay tenant_id, buscamos por número de teléfono del cliente.
    """
    tenant_id = msg.tenant_id
    
    # ── Resolver tenant ────────────────────────────────────────────────────
    if not tenant_id:
        # Fallback: buscar el tenant por número de teléfono del cliente
        clean_number = "".join(filter(str.isdigit, msg.from_number))
        
        # Buscar cliente cuyo teléfono coincida con el remitente
        all_clientes = db.query(Cliente).filter(
            Cliente.telefono_whatsapp != None
        ).all()
        
        cliente_encontrado = None
        for c in all_clientes:
            c_digits = "".join(filter(str.isdigit, c.telefono_whatsapp or ""))
            if c_digits and (c_digits in clean_number or clean_number in c_digits):
                cliente_encontrado = c
                tenant_id = c.tenant_id
                break
        
        if not tenant_id:
            print(f"[Webhook] Mensaje de número desconocido: {msg.from_number}")
            return {"status": "ignored", "reason": "tenant_not_resolved"}
    
    # ── Verificar tenant activo ─────────────────────────────────────────────
    tenant = db.query(Tenant).filter(
        Tenant.id == tenant_id,
        Tenant.activo == True
    ).first()
    
    if not tenant:
        print(f"[Webhook] Tenant {tenant_id} inactivo o no encontrado")
        return {"status": "ignored", "reason": "tenant_inactive"}
    
    # ── Identificar Cliente (dentro del tenant) ─────────────────────────────
    clean_number = "".join(filter(str.isdigit, msg.from_number))
    
    cliente = None
    all_clientes = db.query(Cliente).filter(
        Cliente.tenant_id == tenant_id,
        Cliente.telefono_whatsapp != None
    ).all()
    
    for c in all_clientes:
        c_digits = "".join(filter(str.isdigit, c.telefono_whatsapp or ""))
        if c_digits and (c_digits in clean_number or clean_number in c_digits):
            cliente = c
            break
    
    # Fallback: buscar por nombre (pushName)
    if not cliente and msg.sender and msg.sender.get("name"):
        clean_name = msg.sender["name"].split(" ")[0].strip()
        cliente = db.query(Cliente).filter(
            Cliente.tenant_id == tenant_id,
            Cliente.razon_social.ilike(f"%{clean_name}%")
        ).first()
    
    if not cliente:
        print(f"[Webhook][{tenant.slug}] Cliente no registrado: {msg.from_number}")
        return {
            "status": "ignored",
            "reason": "cliente_no_registrado",
            "tenant": tenant.slug,
            "from": msg.from_number
        }
    
    # ── Parsear Pedido con IA ───────────────────────────────────────────────
    parsed = await parse_whatsapp_order(msg.body)
    print(f"[Webhook][{tenant.slug}] IA parseó: {parsed}")
    
    if not parsed.get("items"):
        print(f"[Webhook][{tenant.slug}] Sin ítems detectados en: '{msg.body}'")
        return {"status": "ignored", "reason": "no_items_detected", "tenant": tenant.slug}
    
    # ── Crear Pedido Borrador ───────────────────────────────────────────────
    obs_prefix = f"WhatsApp ({msg.from_number})"
    new_pedido = Pedido(
        tenant_id=tenant_id,
        cliente_id=cliente.id,
        estado="Pendiente de Validación",
        observaciones=f"{obs_prefix}: '{msg.body[:200]}'",
        total=0.0
    )
    db.add(new_pedido)
    db.flush()
    
    # ── Intentar asociar ítems del pedido ──────────────────────────────────
    for item in parsed["items"]:
        producto = db.query(Producto).filter(
            Producto.tenant_id == tenant_id,
            Producto.descripcion.ilike(f"%{item['producto']}%")
        ).first()
        
        if not producto:
            continue
        
        # Precio desde la lista del cliente
        price_detail = db.query(ListaPreciosDetalle).filter(
            ListaPreciosDetalle.lista_precios_id == cliente.lista_precios_id,
            ListaPreciosDetalle.producto_id == producto.id
        ).first()
        
        precio = price_detail.precio_venta if price_detail else 0.0
        is_kg = item.get("unidad", "").lower() in ["kg", "kilos", "kilo"]
        
        item_obj = PedidoItem(
            pedido_id=new_pedido.id,
            producto_id=producto.id,
            cantidad_unidades=0.0 if is_kg else item["cantidad"],
            peso_estimado_kg=item["cantidad"] if is_kg else 0.0,
            precio_unitario=precio,
            subtotal=item["cantidad"] * precio
        )
        db.add(item_obj)
        new_pedido.total += item_obj.subtotal
    
    db.commit()
    print(f"[Webhook][{tenant.slug}] Pedido #{new_pedido.id} creado para {cliente.razon_social}")
    return {
        "status": "success",
        "pedido_id": new_pedido.id,
        "tenant": tenant.slug,
        "cliente": cliente.razon_social
    }


@router.get("/status")
async def get_whatsapp_status():
    """
    Obtiene el estado de todas las sesiones WhatsApp desde el bot.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("http://whatsapp-bot:3001/status", timeout=3.0)
            return response.json()
        except Exception:
            return {"error": "Bot no disponible", "sessions": {}}


@router.get("/status/{tenant_slug}")
async def get_whatsapp_status_tenant(tenant_slug: str):
    """
    Obtiene el estado de la sesión WhatsApp de un tenant específico.
    Retorna 'disconnected' cuando el tenant no tiene sesión activa en el bot.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"http://whatsapp-bot:3001/status/{tenant_slug}",
                timeout=3.0
            )
            # 404 = el bot no tiene sesión para este tenant → desconectado, mostrar QR
            if response.status_code == 404:
                return {"status": "disconnected", "qr": None, "tenant_slug": tenant_slug}
            data = response.json()
            # Si la respuesta no tiene campo 'status' reconocido, forzar disconnected
            if data.get("status") not in ("connected", "disconnected", "qr_ready", "connecting"):
                return {"status": "disconnected", "qr": None, "tenant_slug": tenant_slug}
            return data
        except Exception:
            return {"status": "disconnected", "qr": None, "tenant_slug": tenant_slug}


@router.post("/logout/{tenant_slug}")
async def logout_whatsapp_tenant(tenant_slug: str):
    """
    Cierra la sesión WhatsApp de un tenant específico.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"http://whatsapp-bot:3001/logout/{tenant_slug}",
                timeout=5.0
            )
            return response.json()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"No se pudo cerrar la sesión: {str(e)}")
