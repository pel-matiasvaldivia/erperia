import os
from sqlalchemy import text
from app.core.database import engine, SessionLocal
from app.core.security import get_password_hash

def run_migrations():
    print("[Migration] Iniciando comprobación de esquema para multi-tenancy...")
    
    # 1. Crear tabla tenants si no existe
    create_tenants_sql = """
    CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(100) UNIQUE NOT NULL,
        razon_social VARCHAR(200) NOT NULL,
        nombre_fantasia VARCHAR(200),
        cuit VARCHAR(20) UNIQUE NOT NULL,
        direccion VARCHAR(300) NOT NULL,
        ciudad VARCHAR(100),
        provincia VARCHAR(100),
        pais VARCHAR(50) DEFAULT 'Argentina',
        codigo_postal VARCHAR(10),
        telefono VARCHAR(30),
        email VARCHAR(150),
        condicion_iva VARCHAR(50) NOT NULL DEFAULT 'Responsable Inscripto',
        whatsapp_numero VARCHAR(30),
        whatsapp_activo BOOLEAN DEFAULT FALSE,
        punto_venta VARCHAR(4) DEFAULT '0001',
        logo_url VARCHAR(500),
        color_primario VARCHAR(7) DEFAULT '#dc2626',
        latitud VARCHAR(30),
        longitud VARCHAR(30),
        geocodificado BOOLEAN DEFAULT FALSE,
        plan VARCHAR(50) DEFAULT 'basico',
        activo BOOLEAN DEFAULT TRUE,
        fecha_alta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_vencimiento TIMESTAMP
    );
    """
    with engine.begin() as conn:
        conn.execute(text(create_tenants_sql))
        print("[Migration] Tabla 'tenants' verificada/creada.")

        # 2. Asegurarse de que exista el tenant por defecto (ID=1)
        res = conn.execute(text("SELECT id FROM tenants WHERE id = 1")).fetchone()
        if not res:
            insert_tenant_sql = """
            INSERT INTO tenants (id, slug, razon_social, cuit, direccion, activo)
            VALUES (1, 'je-cerdos', 'FRIGORIFICO DE CERDO J&E', '30-71543210-9', 'Av. Circunvalación N° 4500, Córdoba, Argentina', true);
            SELECT setval('tenants_id_seq', 1);
            """
            conn.execute(text(insert_tenant_sql))
            print("[Migration] Tenant por defecto insertado (ID=1).")

        # 3. Lista de tablas a las que se les debe agregar 'tenant_id'
        # formato: (nombre_tabla, es_nullable_tenant_id)
        tablas = [
            ("usuarios", True),
            ("clientes", False),
            ("productos", False),
            ("rutas", False),
            ("listas_precios", False),
            ("pedidos", False),
            ("ordenes_preparacion", False),
            ("comprobantes", False),
            ("cuentas_corrientes", False),
            ("movimientos_cc", False),
            ("configuracion_sistema", False)
        ]

        for tabla, is_nullable in tablas:
            # Verificar si la columna tenant_id ya existe
            check_col_sql = f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = '{tabla}' AND column_name = 'tenant_id';
            """
            col_res = conn.execute(text(check_col_sql)).fetchone()
            
            if not col_res:
                # Verificar si la tabla existe antes de intentar alterarla
                check_table_sql = f"SELECT 1 FROM information_schema.tables WHERE table_name = '{tabla}';"
                table_res = conn.execute(text(check_table_sql)).fetchone()
                
                if table_res:
                    print(f"[Migration] Agregando columna tenant_id a la tabla '{tabla}'...")
                    # 1. Agregar columna como nullable primero
                    alter_sql = f"ALTER TABLE {tabla} ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);"
                    conn.execute(text(alter_sql))
                else:
                    print(f"[Migration] Omitiendo tabla '{tabla}' porque no existe en el esquema.")
                    continue
                
                # 2. Inicializar con tenant_id = 1
                update_sql = f"UPDATE {tabla} SET tenant_id = 1;"
                conn.execute(text(update_sql))
                
                # 3. Si no debe ser nullable, poner el constraint NOT NULL
                if not is_nullable:
                    conn.execute(text(f"ALTER TABLE {tabla} ALTER COLUMN tenant_id SET NOT NULL;"))
                
                # 4. Crear índice
                conn.execute(text(f"CREATE INDEX IF NOT EXISTS ix_{tabla}_tenant_id ON {tabla}(tenant_id);"))
                print(f"[Migration] Columna tenant_id agregada y configurada en tabla '{tabla}'.")

        # 4. Modificar restricciones de unicidad únicas globales a por-tenant
        
        # A. Usuarios email (eliminar restricción anterior si existe, añadir uq_usuario_email_tenant)
        conn.execute(text("ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;"))
        conn.execute(text("DROP INDEX IF EXISTS ix_usuarios_email;"))
        conn.execute(text("ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS uq_usuario_email_tenant;"))
        conn.execute(text("ALTER TABLE usuarios ADD CONSTRAINT uq_usuario_email_tenant UNIQUE (email, tenant_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_usuarios_email ON usuarios(email);"))

        # B. Clientes cuit
        conn.execute(text("ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_cuit_key;"))
        conn.execute(text("DROP INDEX IF EXISTS ix_clientes_cuit;"))
        conn.execute(text("ALTER TABLE clientes DROP CONSTRAINT IF EXISTS uq_cliente_cuit_tenant;"))
        conn.execute(text("ALTER TABLE clientes ADD CONSTRAINT uq_cliente_cuit_tenant UNIQUE (cuit, tenant_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_clientes_cuit ON clientes(cuit);"))

        # C. Productos codigo
        conn.execute(text("ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_codigo_key;"))
        conn.execute(text("DROP INDEX IF EXISTS ix_productos_codigo;"))
        conn.execute(text("ALTER TABLE productos DROP CONSTRAINT IF EXISTS uq_producto_codigo_tenant;"))
        conn.execute(text("ALTER TABLE productos ADD CONSTRAINT uq_producto_codigo_tenant UNIQUE (codigo, tenant_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_productos_codigo ON productos(codigo);"))

        # D. Comprobantes numero
        conn.execute(text("ALTER TABLE comprobantes DROP CONSTRAINT IF EXISTS comprobantes_numero_key;"))
        conn.execute(text("DROP INDEX IF EXISTS ix_comprobantes_numero;"))
        conn.execute(text("ALTER TABLE comprobantes DROP CONSTRAINT IF EXISTS uq_comprobante_numero_tenant;"))
        conn.execute(text("ALTER TABLE comprobantes ADD CONSTRAINT uq_comprobante_numero_tenant UNIQUE (numero, tenant_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_comprobantes_numero ON comprobantes(numero);"))

        # E. Configuracion clave
        conn.execute(text("ALTER TABLE configuracion_sistema DROP CONSTRAINT IF EXISTS configuracion_sistema_clave_key;"))
        conn.execute(text("DROP INDEX IF EXISTS ix_configuracion_sistema_clave;"))
        conn.execute(text("ALTER TABLE configuracion_sistema DROP CONSTRAINT IF EXISTS uq_config_clave_tenant;"))
        conn.execute(text("ALTER TABLE configuracion_sistema ADD CONSTRAINT uq_config_clave_tenant UNIQUE (clave, tenant_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_configuracion_sistema_clave ON configuracion_sistema(clave);"))

        # 5. Agregar campos de geolocalización a clientes si no existen
        campos_geo_cliente = [
            ("latitud", "VARCHAR(30)"),
            ("longitud", "VARCHAR(30)"),
            ("geocodificado", "BOOLEAN DEFAULT FALSE"),
            ("orden_ruta", "INTEGER")
        ]
        for col, col_type in campos_geo_cliente:
            check_geo = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = '{col}';")).fetchone()
            if not check_geo:
                conn.execute(text(f"ALTER TABLE clientes ADD COLUMN {col} {col_type};"))
                print(f"[Migration] Agregado campo geográfico '{col}' a la tabla clientes.")

        # 6. Agregar campos de optimización a rutas si no existen
        campos_opt_ruta = [
            ("waypoints_geojson", "TEXT"),
            ("distancia_total_km", "FLOAT"),
            ("tiempo_estimado_min", "INTEGER"),
            ("ultima_optimizacion", "TIMESTAMP")
        ]
        for col, col_type in campos_opt_ruta:
            check_opt = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = 'rutas' AND column_name = '{col}';")).fetchone()
            if not check_opt:
                conn.execute(text(f"ALTER TABLE rutas ADD COLUMN {col} {col_type};"))
                print(f"[Migration] Agregado campo de optimización '{col}' a la tabla rutas.")

        # 7. Agregar campos de WhatsApp y punto de venta a tenants si no existen
        campos_tenant = [
            ("whatsapp_numero", "VARCHAR(30)"),
            ("whatsapp_activo", "BOOLEAN DEFAULT FALSE"),
            ("punto_venta", "VARCHAR(4) DEFAULT '0001'")
        ]
        for col, col_type in campos_tenant:
            check_col = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = '{col}';")).fetchone()
            if not check_col:
                conn.execute(text(f"ALTER TABLE tenants ADD COLUMN {col} {col_type};"))
                print(f"[Migration] Agregado campo '{col}' a la tabla tenants.")

    print("[Migration] Comprobación de esquema finalizada exitosamente.")
