from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.core.config import settings
from app.models.tenant import Tenant
from app.models.usuario import Usuario
from app.models.listas_precios import ListaPrecios, ListaPreciosDetalle
from app.models.producto import Producto
from app.models.ruta import Ruta
from app.models.cliente import Cliente
from app.models.cuenta_corriente import CuentaCorriente
from app.models.configuracion import ConfiguracionSistema
import datetime

def seed_platform():
    """
    Creates global PLATFORM_ADMIN. Runs once.
    """
    db = SessionLocal()
    try:
        existing = db.query(Usuario).filter(Usuario.rol == "PLATFORM_ADMIN").first()
        if not existing:
            admin = Usuario(
                nombre="Platform Administrator",
                email=settings.PLATFORM_ADMIN_EMAIL,
                password_hash=get_password_hash(settings.PLATFORM_ADMIN_PASSWORD),
                rol="PLATFORM_ADMIN",
                tenant_id=None,
                activo=True
            )
            db.add(admin)
            db.commit()
            print(f"✅ PLATFORM_ADMIN creado: {settings.PLATFORM_ADMIN_EMAIL}")
    except Exception as e:
        db.rollback()
        print(f"Error seeding platform: {e}")
    finally:
        db.close()

def seed_tenant_data(db: Session, tenant_id: int):
    """
    Initializes minimum/default data for a given tenant:
    - Default users (TENANT_ADMIN, ADMINISTRATIVO, VENDEDOR, REPARTIDOR)
    - Default configs
    - Lists, products, routes, etc.
    """
    # 1. Seed default Users for the tenant
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        print(f"⚠️ Tenant ID {tenant_id} no encontrado. Omitiendo seed de negocio.")
        return

    # Helper function to sanitize name for domain
    import unicodedata
    def sanitize_domain_name(name: str) -> str:
        s = name.lower().strip()
        s = unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('ASCII')
        s = "".join(c for c in s if c.isalnum())
        return s if s else "tenant"

    if tenant_id != 1:
        # Mini-seed for new tenants
        domain_name = tenant.nombre_fantasia if tenant.nombre_fantasia else tenant.razon_social
        sanitized_domain = sanitize_domain_name(domain_name)
        t_admin_email = f"sysadmin@{sanitized_domain}.com.ar"
        
        t_admin = db.query(Usuario).filter(Usuario.email == t_admin_email, Usuario.tenant_id == tenant_id).first()
        if not t_admin:
            t_admin = Usuario(
                nombre=f"Administrador General {tenant.razon_social}",
                email=t_admin_email,
                password_hash=get_password_hash("admin123"),
                rol="TENANT_ADMIN",
                tenant_id=tenant_id,
                activo=True,
                debe_cambiar_password=True
            )
            db.add(t_admin)
            db.commit()
            db.refresh(t_admin)
            
        # Seed configs
        configs = [
            {"clave": "DIAS_VENCIMIENTO_FACTURA", "valor": "15", "modulo": "Ventas", "descripcion": "Días hasta el vencimiento de una factura"},
            {"clave": "MONEDA_SIMBOLO", "valor": "$", "modulo": "General", "descripcion": "Símbolo de la moneda activa"},
            {"clave": "NUM_FACTURA_SIGUIENTE", "valor": "1", "modulo": "General", "descripcion": "Siguiente número correlativo de factura"},
            {"clave": "NUM_REMITO_SIGUIENTE", "valor": "1", "modulo": "General", "descripcion": "Siguiente número correlativo de remito"},
            {"clave": "NUM_PEDIDO_SIGUIENTE", "valor": "1", "modulo": "General", "descripcion": "Siguiente número correlativo de nota de pedido"},
            {"clave": "MODULO_CUENTAS_CORRIENTES", "valor": "true", "modulo": "Configuracion", "descripcion": "Habilitar/Deshabilitar módulo de cuentas corrientes"},
            {"clave": "MODULO_DESPACHO", "valor": "true", "modulo": "Configuracion", "descripcion": "Habilitar/Deshabilitar módulo de despacho y rutas"}
        ]
        for conf in configs:
            ex_conf = db.query(ConfiguracionSistema).filter(
                ConfiguracionSistema.clave == conf["clave"], 
                ConfiguracionSistema.tenant_id == tenant_id
            ).first()
            if not ex_conf:
                db.add(ConfiguracionSistema(**conf, tenant_id=tenant_id))
        db.commit()
        print(f"✅ Seeding de nuevo tenant completado para ID {tenant_id} ({tenant.razon_social})")
        return

    # Check / Create Tenant Admin (renamed from SUPERADMIN)
    suffix = f"_{tenant.slug}" if tenant_id != 1 else ""
    t_admin_email = f"admin{suffix}@erperia.com.ar" if tenant_id != 1 else "admin@erperia.com.ar"
    t_admin = db.query(Usuario).filter(Usuario.email == t_admin_email, Usuario.tenant_id == tenant_id).first()
    if not t_admin:
        t_admin = Usuario(
            nombre=f"Administrador General {tenant.razon_social}",
            email=t_admin_email,
            password_hash=get_password_hash("admin123"),
            rol="TENANT_ADMIN",
            tenant_id=tenant_id,
            activo=True
        )
        db.add(t_admin)
        db.commit()
        db.refresh(t_admin)

    # Other tenant users
    t_staff_email = f"admin_ventas{suffix}@erperia.com.ar" if tenant_id != 1 else "admin_ventas@erperia.com.ar"
    t_staff = db.query(Usuario).filter(Usuario.email == t_staff_email, Usuario.tenant_id == tenant_id).first()
    if not t_staff:
        t_staff = Usuario(
            nombre=f"Ventas {tenant.razon_social}",
            email=t_staff_email,
            password_hash=get_password_hash("ventas123"),
            rol="ADMINISTRATIVO",
            tenant_id=tenant_id,
            activo=True
        )
        db.add(t_staff)

    t_vendedor_email = f"vendedor{suffix}@erperia.com.ar" if tenant_id != 1 else "vendedor@erperia.com.ar"
    t_vendedor = db.query(Usuario).filter(Usuario.email == t_vendedor_email, Usuario.tenant_id == tenant_id).first()
    if not t_vendedor:
        t_vendedor = Usuario(
            nombre=f"Vendedor {tenant.razon_social}",
            email=t_vendedor_email,
            password_hash=get_password_hash("vendedor123"),
            rol="VENDEDOR",
            tenant_id=tenant_id,
            activo=True
        )
        db.add(t_vendedor)

    t_reparto_email = f"reparto{suffix}@erperia.com.ar" if tenant_id != 1 else "reparto@erperia.com.ar"
    t_repartidor = db.query(Usuario).filter(Usuario.email == t_reparto_email, Usuario.tenant_id == tenant_id).first()
    if not t_repartidor:
        t_repartidor = Usuario(
            nombre=f"Repartidor {tenant.razon_social}",
            email=t_reparto_email,
            password_hash=get_password_hash("reparto123"),
            rol="REPARTIDOR",
            tenant_id=tenant_id,
            activo=True
        )
        db.add(t_repartidor)
        db.commit()
        db.refresh(t_repartidor)

    # 2. Seed Default Routes
    ruta_norte = db.query(Ruta).filter(Ruta.nombre == "Ruta Norte", Ruta.tenant_id == tenant_id).first()
    if not ruta_norte:
        ruta_norte = Ruta(
            nombre="Ruta Norte",
            zona="Zona Norte GBA",
            dias_reparto="Lunes,Miércoles,Viernes",
            repartidor_id=t_repartidor.id,
            tenant_id=tenant_id
        )
        db.add(ruta_norte)
        
    ruta_sur = db.query(Ruta).filter(Ruta.nombre == "Ruta Sur", Ruta.tenant_id == tenant_id).first()
    if not ruta_sur:
        ruta_sur = Ruta(
            nombre="Ruta Sur",
            zona="Zona Sur GBA",
            dias_reparto="Martes,Jueves,Sábado",
            repartidor_id=t_repartidor.id,
            tenant_id=tenant_id
        )
        db.add(ruta_sur)
        db.commit()
        db.refresh(ruta_norte)
        db.refresh(ruta_sur)

    # 3. Seed Price Lists
    listas_data = [
        {"id": 1 + (tenant_id - 1)*10, "nombre": "Lista 1 - Minorista", "descripcion": "Precios minoristas sugeridos al público"},
        {"id": 2 + (tenant_id - 1)*10, "nombre": "Lista 2 - Mayorista A", "descripcion": "Precios mayoristas para distribuidores medianos"},
        {"id": 4 + (tenant_id - 1)*10, "nombre": "Lista 4 - Mayorista B", "descripcion": "Precios mayoristas preferenciales grandes cuentas"},
        {"id": 6 + (tenant_id - 1)*10, "nombre": "Lista 6 - Especial", "descripcion": "Precios para clientes especiales de fábrica"},
        {"id": 7 + (tenant_id - 1)*10, "nombre": "Lista 7 - Feria/Mercado", "descripcion": "Precios de oferta para puestos de feria"},
        {"id": 8 + (tenant_id - 1)*10, "nombre": "Lista 8 - Precios Oferta", "descripcion": "Precios promocionales y liquidación de stock"}
    ]
    
    listas = {}
    for l_info in listas_data:
        lista = db.query(ListaPrecios).filter(ListaPrecios.id == l_info["id"]).first()
        if not lista:
            lista = ListaPrecios(
                id=l_info["id"],
                nombre=l_info["nombre"],
                descripcion=l_info["descripcion"],
                activa=True,
                fecha_actualizacion=datetime.datetime.utcnow(),
                tenant_id=tenant_id
            )
            db.add(lista)
        listas[l_info["id"]] = lista
    db.commit()

    # 4. Seed Products
    productos_data = [
        {"codigo": "001", "descripcion": "Bondiola de Cerdo", "departamento": "Cortes frescos", "costo": 3500.0, "venta": 4500.0},
        {"codigo": "002", "descripcion": "Chorizo Colorado", "departamento": "Elaborados", "costo": 2800.0, "venta": 3800.0},
        {"codigo": "003", "descripcion": "Chorizo Especial", "departamento": "Elaborados", "costo": 2900.0, "venta": 3950.0},
        {"codigo": "004", "descripcion": "Chorizo Intermedio", "departamento": "Elaborados", "costo": 2500.0, "venta": 3400.0},
        {"codigo": "005", "descripcion": "Hamburguesas de Cerdo", "departamento": "Elaborados", "costo": 2200.0, "venta": 3100.0},
        {"codigo": "006", "descripcion": "Lomo de Cerdo", "departamento": "Cortes frescos", "costo": 3800.0, "venta": 4900.0},
        {"codigo": "007", "descripcion": "Longaniza Española", "departamento": "Fiambres", "costo": 4200.0, "venta": 5800.0},
        {"codigo": "008", "descripcion": "Matambre de Cerdo", "departamento": "Cortes frescos", "costo": 3900.0, "venta": 5100.0},
        {"codigo": "009", "descripcion": "Milanesas de Cerdo", "departamento": "Elaborados", "costo": 2400.0, "venta": 3400.0},
        {"codigo": "010", "descripcion": "Milanesa de Pollo", "departamento": "Elaborados", "costo": 2300.0, "venta": 3300.0},
        {"codigo": "011", "descripcion": "Morcilla Criolla", "departamento": "Elaborados", "costo": 2000.0, "venta": 2800.0},
        {"codigo": "012", "descripcion": "Morcilla Valenciana", "departamento": "Elaborados", "costo": 2200.0, "venta": 3000.0},
        {"codigo": "013", "descripcion": "Panceta Salada", "departamento": "Fiambres", "costo": 3200.0, "venta": 4400.0},
        {"codigo": "014", "descripcion": "Pechito con Manta", "departamento": "Cortes frescos", "costo": 3000.0, "venta": 4200.0},
        {"codigo": "015", "descripcion": "Punta de Espalda de Cerdo", "departamento": "Cortes frescos", "costo": 3400.0, "venta": 4700.0},
        {"codigo": "016", "descripcion": "Queso de Cerdo", "departamento": "Fiambres", "costo": 2100.0, "venta": 2950.0},
        {"codigo": "017", "descripcion": "Salchicha Parrillera", "departamento": "Elaborados", "costo": 2700.0, "venta": 3700.0}
    ]

    for p_info in productos_data:
        # Use custom code mapping or just check by code and tenant_id
        prod = db.query(Producto).filter(Producto.codigo == p_info["codigo"], Producto.tenant_id == tenant_id).first()
        if not prod:
            prod = Producto(
                codigo=p_info["codigo"],
                descripcion=p_info["descripcion"],
                departamento=p_info["departamento"],
                activo=True,
                tenant_id=tenant_id
            )
            db.add(prod)
            db.commit()
            db.refresh(prod)
        
        multipliers = {1: 1.0, 2: 0.90, 4: 0.85, 6: 0.80, 7: 0.88, 8: 0.75}
        for list_offset, mult in multipliers.items():
            list_id = list_offset + (tenant_id - 1)*10
            det = db.query(ListaPreciosDetalle).filter(
                ListaPreciosDetalle.lista_precios_id == list_id,
                ListaPreciosDetalle.producto_id == prod.id
            ).first()
            if not det:
                precio_venta_calc = round(p_info["venta"] * mult, 2)
                precio_mayoreo_calc = round(precio_venta_calc * 0.95, 2)
                det = ListaPreciosDetalle(
                    lista_precios_id=list_id,
                    producto_id=prod.id,
                    precio_costo=p_info["costo"],
                    precio_venta=precio_venta_calc,
                    precio_mayoreo=precio_mayoreo_calc,
                    stock=150.0,
                    stock_minimo=30.0
                )
                db.add(det)
    db.commit()

    # 5. Seed a default Customer with Account
    cust_cuit = f"20-98765432-{tenant_id}"
    cliente_pepe = db.query(Cliente).filter(Cliente.cuit == cust_cuit, Cliente.tenant_id == tenant_id).first()
    if not cliente_pepe:
        user_pepe_email = f"pepe{suffix}@gmail.com"
        user_pepe = db.query(Usuario).filter(Usuario.email == user_pepe_email, Usuario.tenant_id == tenant_id).first()
        if not user_pepe:
            user_pepe = Usuario(
                nombre=f"Carnicería Pepe {tenant.nombre_fantasia or tenant.razon_social}",
                email=user_pepe_email,
                password_hash=get_password_hash("pepe123"),
                rol="CLIENTE",
                tenant_id=tenant_id,
                activo=True
            )
            db.add(user_pepe)
            db.commit()
            db.refresh(user_pepe)

        cliente_pepe = Cliente(
            razon_social=f"Carnicería Don Pepe S.H. ({tenant.razon_social})",
            cuit=cust_cuit,
            direccion="Av. San Martín 1500, Villa María",
            telefono_whatsapp="+5493534123456",
            ruta_id=ruta_norte.id,
            lista_precios_id=2 + (tenant_id - 1)*10,
            limite_credito=300000.0,
            activo=True,
            usuario_id=user_pepe.id,
            tenant_id=tenant_id
        )
        db.add(cliente_pepe)
        db.commit()
        db.refresh(cliente_pepe)

        cc = CuentaCorriente(
            cliente_id=cliente_pepe.id,
            saldo_actual=0.0,
            limite_credito=300000.0,
            tenant_id=tenant_id
        )
        db.add(cc)
        db.commit()

    # 6. Seed Config
    configs = [
        {"clave": "DIAS_VENCIMIENTO_FACTURA", "valor": "15", "modulo": "Ventas", "descripcion": "Días hasta el vencimiento de una factura"},
        {"clave": "MONEDA_SIMBOLO", "valor": "$", "modulo": "General", "descripcion": "Símbolo de la moneda activa"},
        {"clave": "NUM_FACTURA_SIGUIENTE", "valor": "1", "modulo": "General", "descripcion": "Siguiente número correlativo de factura"},
        {"clave": "NUM_REMITO_SIGUIENTE", "valor": "1", "modulo": "General", "descripcion": "Siguiente número correlativo de remito"},
        {"clave": "NUM_PEDIDO_SIGUIENTE", "valor": "1", "modulo": "General", "descripcion": "Siguiente número correlativo de nota de pedido"},
        {"clave": "MODULO_CUENTAS_CORRIENTES", "valor": "true", "modulo": "Configuracion", "descripcion": "Habilitar/Deshabilitar módulo de cuentas corrientes"},
        {"clave": "MODULO_DESPACHO", "valor": "true", "modulo": "Configuracion", "descripcion": "Habilitar/Deshabilitar módulo de despacho y rutas"}
    ]

    for conf in configs:
        ex_conf = db.query(ConfiguracionSistema).filter(
            ConfiguracionSistema.clave == conf["clave"], 
            ConfiguracionSistema.tenant_id == tenant_id
        ).first()
        if not ex_conf:
            db.add(ConfiguracionSistema(**conf, tenant_id=tenant_id))
    db.commit()
    print(f"✅ Seeding completado para tenant ID {tenant_id} ({tenant.razon_social})")

def seed_db():
    """Main db seed entrypoint."""
    seed_platform()
    db = SessionLocal()
    try:
        # Seed the default tenant (ID=1)
        seed_tenant_data(db, 1)
    finally:
        db.close()
