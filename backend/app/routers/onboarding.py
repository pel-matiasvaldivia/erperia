import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user, RoleChecker, get_password_hash
from app.core.tenant import get_current_tenant
from app.models.tenant import Tenant
from app.models.usuario import Usuario
from app.models.producto import Producto
from app.models.listas_precios import ListaPrecios, ListaPreciosDetalle
from app.models.cliente import Cliente
from app.models.cuenta_corriente import CuentaCorriente
from app.schemas.usuario import UsuarioResponse

router = APIRouter(prefix="/onboarding", tags=["Tenant Onboarding"])
admin_only = RoleChecker(["SUPERADMIN", "TENANT_ADMIN"])

# Pydantic schemas for request validation
class EmpresaUpdate(BaseModel):
    razon_social: str
    nombre_fantasia: Optional[str] = None
    direccion: str
    ciudad: Optional[str] = None
    provincia: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    color_primario: Optional[str] = "#dc2626"

class EmpleadoCreate(BaseModel):
    nombre: str
    email: str
    password: str
    rol: str # ADMINISTRATIVO, VENDEDOR, REPARTIDOR, DESPACHANTE, PRODUCCION

@router.get("/empresa")
def get_empresa_onboarding(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Fetch current company profile to pre-fill the onboarding form
    """
    return {
        "razon_social": tenant.razon_social,
        "nombre_fantasia": tenant.nombre_fantasia,
        "direccion": tenant.direccion,
        "ciudad": tenant.ciudad,
        "provincia": tenant.provincia,
        "pais": tenant.pais,
        "codigo_postal": tenant.codigo_postal,
        "telefono": tenant.telefono,
        "email": tenant.email,
        "color_primario": tenant.color_primario or "#dc2626"
    }

@router.post("/empresa")
def update_empresa_onboarding(
    data: EmpresaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Step 1: Configure company profile and branding
    """
    tenant.razon_social = data.razon_social
    tenant.nombre_fantasia = data.nombre_fantasia
    tenant.direccion = data.direccion
    tenant.ciudad = data.ciudad
    tenant.provincia = data.provincia
    tenant.telefono = data.telefono
    tenant.email = data.email
    if data.color_primario:
        tenant.color_primario = data.color_primario
    
    db.commit()
    db.refresh(tenant)
    return {"message": "Datos de la empresa guardados exitosamente", "tenant_id": tenant.id}


@router.post("/usuarios", response_model=UsuarioResponse)
def create_empleado_onboarding(
    data: EmpleadoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Step 2: Add employees/users to the tenant
    """
    # Check if email is already taken
    existing = db.query(Usuario).filter(Usuario.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado en la plataforma")
        
    # Check valid role
    valid_roles = ["ADMINISTRATIVO", "VENDEDOR", "REPARTIDOR", "DESPACHANTE", "PRODUCCION", "TENANT_ADMIN"]
    if data.rol not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Rol no válido. Opciones: {valid_roles}")

    new_user = Usuario(
        nombre=data.nombre,
        email=data.email,
        password_hash=get_password_hash(data.password),
        rol=data.rol,
        tenant_id=tenant.id,
        activo=True,
        debe_cambiar_password=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/cargar-productos")
async def upload_productos_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Step 3: Bulk upload products and prices via CSV file
    Format: codigo,descripcion,precio_costo,precio_venta
    """
    contents = await file.read()
    try:
        decoded = contents.decode('utf-8-sig')
    except Exception:
        try:
            decoded = contents.decode('latin1')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"No se pudo decodificar el archivo: {e}")

    # Detect delimiter
    delimiter = ','
    first_line = decoded.splitlines()[0] if decoded.splitlines() else ""
    if ';' in first_line:
        delimiter = ';'

    f = io.StringIO(decoded)
    reader = csv.DictReader(f, delimiter=delimiter)
    
    # Validate fields
    fieldnames = reader.fieldnames or []
    cleaned_fields = [f.strip().lower() for f in fieldnames]
    
    # We map whatever column headings user provides as long as they clean to required names
    field_mapping = {}
    required = ["codigo", "descripcion", "precio_costo", "precio_venta"]
    for r in required:
        for idx, col in enumerate(cleaned_fields):
            if col == r or col.replace(' ', '_') == r or col.replace('"', '') == r:
                field_mapping[r] = fieldnames[idx]
                break

    if len(field_mapping) < 4:
        raise HTTPException(
            status_code=400, 
            detail=f"El archivo CSV debe contener las columnas: codigo, descripcion, precio_costo, precio_venta. Columnas detectadas: {fieldnames}"
        )

    # 1. Ensure tenant default price list exists
    lista_id = 1 + (tenant.id - 1) * 10
    default_list = db.query(ListaPrecios).filter(ListaPrecios.id == lista_id, ListaPrecios.tenant_id == tenant.id).first()
    if not default_list:
        default_list = ListaPrecios(
            id=lista_id,
            nombre="Lista 1 - Minorista",
            descripcion="Precios minoristas al público",
            activa=True,
            tenant_id=tenant.id
        )
        db.add(default_list)
        db.commit()

    # 2. Delete existing products for this tenant (clean slate upload)
    # This also cascades and deletes ListaPreciosDetalle
    db.query(Producto).filter(Producto.tenant_id == tenant.id).delete(synchronize_session=False)
    db.commit()

    count = 0
    errors = []
    
    for row_idx, row in enumerate(reader, start=1):
        try:
            codigo = row[field_mapping["codigo"]].strip()
            descripcion = row[field_mapping["descripcion"]].strip()
            costo_raw = row[field_mapping["precio_costo"]].strip()
            venta_raw = row[field_mapping["precio_venta"]].strip()

            if not codigo or not descripcion:
                continue

            # Parse numbers
            precio_costo = float(costo_raw.replace(',', '.'))
            precio_venta = float(venta_raw.replace(',', '.'))
            precio_mayoreo = round(precio_venta * 0.95, 2)
            
            # Create product
            prod = Producto(
                codigo=codigo,
                descripcion=descripcion,
                departamento="General",
                activo=True,
                tenant_id=tenant.id
            )
            db.add(prod)
            db.flush() # get product id
            
            # Create price list entry
            det = ListaPreciosDetalle(
                lista_precios_id=lista_id,
                producto_id=prod.id,
                precio_costo=precio_costo,
                precio_venta=precio_venta,
                precio_mayoreo=precio_mayoreo,
                stock=100.0,
                stock_minimo=10.0
            )
            db.add(det)
            count += 1
        except Exception as e:
            errors.append(f"Fila {row_idx}: {str(e)}")

    if errors:
        db.rollback()
        raise HTTPException(
            status_code=400, 
            detail=f"Error procesando filas en el CSV de productos. Primeros errores:\n" + "\n".join(errors[:5])
        )

    db.commit()
    return {"message": f"Se cargaron con éxito {count} productos y precios.", "count": count}


@router.post("/cargar-clientes")
async def upload_clientes_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Step 4: Bulk upload clients via CSV file
    Format: nombre,razon_social,cuit,celular,domicilio
    """
    contents = await file.read()
    try:
        decoded = contents.decode('utf-8-sig')
    except Exception:
        try:
            decoded = contents.decode('latin1')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"No se pudo decodificar el archivo: {e}")

    # Detect delimiter
    delimiter = ','
    first_line = decoded.splitlines()[0] if decoded.splitlines() else ""
    if ';' in first_line:
        delimiter = ';'

    f = io.StringIO(decoded)
    reader = csv.DictReader(f, delimiter=delimiter)
    
    # Validate fields
    fieldnames = reader.fieldnames or []
    cleaned_fields = [f.strip().lower() for f in fieldnames]
    
    field_mapping = {}
    required = ["nombre", "razon_social", "cuit", "celular", "domicilio"]
    for r in required:
        for idx, col in enumerate(cleaned_fields):
            if col == r or col.replace(' ', '_') == r or col.replace('"', '') == r:
                field_mapping[r] = fieldnames[idx]
                break

    if len(field_mapping) < 5:
        raise HTTPException(
            status_code=400, 
            detail=f"El archivo CSV debe contener las columnas: nombre, razon_social, cuit, celular, domicilio. Columnas detectadas: {fieldnames}"
        )

    # 1. Clean existing clients for this tenant
    # Delete accounts first
    db.query(CuentaCorriente).filter(CuentaCorriente.tenant_id == tenant.id).delete(synchronize_session=False)
    db.query(Cliente).filter(Cliente.tenant_id == tenant.id).delete(synchronize_session=False)
    db.commit()

    # Get or create a default pricing list for references
    lista_id = 1 + (tenant.id - 1) * 10
    default_list = db.query(ListaPrecios).filter(ListaPrecios.id == lista_id, ListaPrecios.tenant_id == tenant.id).first()
    if not default_list:
        default_list = ListaPrecios(
            id=lista_id,
            nombre="Lista 1 - Minorista",
            descripcion="Precios minoristas al público",
            activa=True,
            tenant_id=tenant.id
        )
        db.add(default_list)
        db.commit()

    count = 0
    errors = []

    for row_idx, row in enumerate(reader, start=1):
        try:
            nombre = row[field_mapping["nombre"]].strip()
            razon_social = row[field_mapping["razon_social"]].strip()
            cuit = row[field_mapping["cuit"]].strip()
            celular = row[field_mapping["celular"]].strip()
            domicilio = row[field_mapping["domicilio"]].strip()

            if not cuit or not razon_social:
                continue

            # Create client
            cli = Cliente(
                razon_social=razon_social,
                cuit=cuit,
                direccion=domicilio,
                telefono_whatsapp=celular,
                activo=True,
                lista_precios_id=lista_id,
                limite_credito=300000.0,
                tenant_id=tenant.id
            )
            db.add(cli)
            db.flush()

            # Create current account
            cc = CuentaCorriente(
                cliente_id=cli.id,
                saldo_actual=0.0,
                limite_credito=300000.0,
                tenant_id=tenant.id
            )
            db.add(cc)
            count += 1
        except Exception as e:
            errors.append(f"Fila {row_idx}: {str(e)}")

    if errors:
        db.rollback()
        raise HTTPException(
            status_code=400, 
            detail=f"Error procesando filas en el CSV de clientes. Primeros errores:\n" + "\n".join(errors[:5])
        )

    db.commit()
    return {"message": f"Se cargaron con éxito {count} clientes con su cuenta corriente.", "count": count}


@router.post("/finalizar")
def finalize_onboarding(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(admin_only),
    tenant: Tenant = Depends(get_current_tenant)
):
    """
    Step 5: Mark tenant onboarding as completed
    """
    tenant.onboarding_completado = True
    db.commit()
    return {"message": "Onboarding completado con éxito. ¡Bienvenido a ERPERIA!", "onboarding_completado": True}
