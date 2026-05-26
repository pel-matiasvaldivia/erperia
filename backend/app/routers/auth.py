from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash, get_current_user
from app.core.tenant import get_current_tenant
from datetime import datetime, timedelta
import re
import unicodedata
from app.models.usuario import Usuario
from app.models.tenant import Tenant
from app.schemas.usuario import Token, UsuarioResponse, UsuarioCreate, LoginRequest
from app.schemas.tenant import TenantCreate
from app.db.seed import seed_tenant_data

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=Token)
def login(request_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Standard OAuth2 Login endpoint. Returns a JWT access token.
    """
    user = db.query(Usuario).filter(Usuario.email == request_data.username).first()
    if not user or not verify_password(request_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.activo:
        raise HTTPException(status_code=400, detail="Usuario inactivo")

    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login-json", response_model=Token)
def login_json(request_data: LoginRequest, db: Session = Depends(get_db)):
    """
    JSON Login endpoint for frontend client convenience.
    """
    user = db.query(Usuario).filter(Usuario.email == request_data.email).first()
    if not user or not verify_password(request_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    if not user.activo:
        raise HTTPException(status_code=400, detail="Usuario inactivo")

    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
def read_users_me(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns details of the currently logged-in user, including tenant context and branding.
    """
    base = {
        "id": current_user.id,
        "nombre": current_user.nombre,
        "email": current_user.email,
        "rol": current_user.rol,
        "activo": current_user.activo,
        "tenant_id": current_user.tenant_id,
        "tenant": None,
        "debe_cambiar_password": getattr(current_user, 'debe_cambiar_password', False) or False
    }

    # PLATFORM_ADMIN has no tenant — return platform-level data
    if current_user.rol == "PLATFORM_ADMIN":
        base["tenant"] = {
            "nombre": "ERPERIA Platform",
            "slug": "platform",
            "color_primario": "#1e293b",
            "logo_url": None,
            "plan": "platform"
        }
        return base

    # For all other roles, load tenant branding
    if current_user.tenant_id:
        tenant = db.query(Tenant).filter(
            Tenant.id == current_user.tenant_id,
            Tenant.activo == True
        ).first()
        if tenant:
            base["tenant"] = {
                "id": tenant.id,
                "slug": tenant.slug,
                "nombre": tenant.razon_social,
                "nombre_fantasia": tenant.nombre_fantasia,
                "cuit": tenant.cuit,
                "color_primario": tenant.color_primario,
                "logo_url": tenant.logo_url,
                "plan": tenant.plan,
                "whatsapp_numero": getattr(tenant, 'whatsapp_numero', None),
                "whatsapp_activo": getattr(tenant, 'whatsapp_activo', False),
                "onboarding_completado": getattr(tenant, 'onboarding_completado', False) or False,
                "fecha_vencimiento": tenant.fecha_vencimiento.isoformat() if tenant.fecha_vencimiento else None,
            }

    return base


@router.post("/register", response_model=UsuarioResponse)
def register_user(
    user_in: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Register a new user.
    - PLATFORM_ADMIN can create any user (including across tenants).
    - TENANT_ADMIN / SUPERADMIN can only create users within their own tenant.
    """
    # Permission check
    if current_user.rol not in ["SUPERADMIN", "TENANT_ADMIN", "PLATFORM_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para registrar nuevos usuarios"
        )

    # Check if email is already registered
    existing_user = db.query(Usuario).filter(Usuario.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    # Determine tenant_id for the new user
    if current_user.rol == "PLATFORM_ADMIN":
        # Platform admin can assign any tenant_id
        new_tenant_id = getattr(user_in, 'tenant_id', None)
    else:
        # Tenant admins always create users within their own tenant
        new_tenant_id = current_user.tenant_id

    new_user = Usuario(
        nombre=user_in.nombre,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        rol=user_in.rol,
        activo=user_in.activo,
        tenant_id=new_tenant_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/change-password")
def change_password(
    current_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Allow any authenticated user to change their own password.
    """
    if not verify_password(current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 8 caracteres")

    current_user.password_hash = get_password_hash(new_password)
    # Clear forced-change flag if it was set
    if getattr(current_user, 'debe_cambiar_password', False):
        current_user.debe_cambiar_password = False
    db.commit()
    return {"detail": "Contraseña actualizada exitosamente"}


def generate_slug(text: str) -> str:
    # Lowercase, replace non-alphanumeric with hyphen
    s = text.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')


def sanitize_domain_name(name: str) -> str:
    s = name.lower().strip()
    s = unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('ASCII')
    s = "".join(c for c in s if c.isalnum())
    return s if s else "tenant"


@router.post("/signup-tenant")
def signup_tenant(tenant_in: TenantCreate, db: Session = Depends(get_db)):
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
        
    # Expiration is exactly 30 days from now
    fecha_vencimiento = datetime.utcnow() + timedelta(days=30)
    
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
        plan="basico",  # trial starts as basico
        activo=True,
        onboarding_completado=False,
        fecha_vencimiento=fecha_vencimiento
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    
    # Run seed data for new tenant (creates the sysadmin user and initial structure)
    try:
        seed_tenant_data(db, tenant.id)
    except Exception as e:
        print(f"Error seeding data for new tenant {tenant.id}: {e}")
        
    # Predict the generated sysadmin email
    domain_name = tenant.nombre_fantasia if tenant.nombre_fantasia else tenant.razon_social
    sanitized_domain = sanitize_domain_name(domain_name)
    sysadmin_email = f"sysadmin@{sanitized_domain}.com.ar"
    
    return {
        "status": "ok",
        "tenant_id": tenant.id,
        "slug": tenant.slug,
        "razon_social": tenant.razon_social,
        "sysadmin_email": sysadmin_email,
        "fecha_vencimiento": tenant.fecha_vencimiento
    }
