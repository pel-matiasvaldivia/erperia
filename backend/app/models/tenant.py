from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    
    # Datos fiscales y empresariales
    razon_social = Column(String(200), nullable=False)
    nombre_fantasia = Column(String(200), nullable=True)
    cuit = Column(String(20), unique=True, nullable=False)
    direccion = Column(String(300), nullable=False)
    ciudad = Column(String(100), nullable=True)
    provincia = Column(String(100), nullable=True)
    pais = Column(String(50), default="Argentina")
    codigo_postal = Column(String(10), nullable=True)
    telefono = Column(String(30), nullable=True)
    email = Column(String(150), nullable=True)
    condicion_iva = Column(String(50), nullable=False, default="Responsable Inscripto")
    
    # WhatsApp Bot — número de teléfono exclusivo de este tenant
    whatsapp_numero = Column(String(30), nullable=True)  # e.g. "5491155556666"
    whatsapp_activo = Column(Boolean, default=False)
    
    # Facturación: punto de venta AFIP (ej: "0001")
    punto_venta = Column(String(4), default="0001")
    
    # Branding
    logo_url = Column(String(500), nullable=True)
    color_primario = Column(String(7), default="#dc2626")  # hex
    
    # Geolocalización del tenant (sede principal)
    latitud = Column(String(30), nullable=True)
    longitud = Column(String(30), nullable=True)
    geocodificado = Column(Boolean, default=False)
    
    # Plan y estado
    plan = Column(String(50), default="basico")  # "basico", "profesional", "enterprise"
    activo = Column(Boolean, default=True)
    onboarding_completado = Column(Boolean, default=False, nullable=True)
    fecha_alta = Column(DateTime, server_default=func.now())
    fecha_vencimiento = Column(DateTime, nullable=True)
    
    # Relaciones
    usuarios = relationship("Usuario", back_populates="tenant")
    clientes = relationship("Cliente", back_populates="tenant")
    productos = relationship("Producto", back_populates="tenant")
    rutas = relationship("Ruta", back_populates="tenant")
    listas_precios = relationship("ListaPrecios", back_populates="tenant")
    pedidos = relationship("Pedido", back_populates="tenant")
    ordenes_preparacion = relationship("OrdenPreparacion", back_populates="tenant")
    comprobantes = relationship("Comprobante", back_populates="tenant")
    cuentas_corrientes = relationship("CuentaCorriente", back_populates="tenant")
    movimientos_cc = relationship("MovimientoCC", back_populates="tenant")
    configuraciones = relationship("ConfiguracionSistema", back_populates="tenant")
    cajas = relationship("CajaDiaria", back_populates="tenant")
