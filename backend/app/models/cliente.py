from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    razon_social = Column(String, nullable=False, index=True)
    cuit = Column(String, nullable=True, index=True)
    direccion = Column(String, nullable=False)
    telefono_whatsapp = Column(String, nullable=True)
    ruta_id = Column(Integer, ForeignKey("rutas.id"), nullable=True)
    lista_precios_id = Column(Integer, ForeignKey("listas_precios.id"), nullable=True)
    limite_credito = Column(Float, default=0.0)
    activo = Column(Boolean, default=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    # Geolocation & Routing
    latitud = Column(String(30), nullable=True)
    longitud = Column(String(30), nullable=True)
    geocodificado = Column(Boolean, default=False)
    orden_ruta = Column(Integer, nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="clientes")
    usuario = relationship("Usuario", back_populates="clientes")
    ruta = relationship("Ruta", back_populates="clientes")
    lista_precios = relationship("ListaPrecios", back_populates="clientes")
    cuenta_corriente = relationship("CuentaCorriente", back_populates="cliente", uselist=False, cascade="all, delete-orphan")
    pedidos = relationship("Pedido", back_populates="cliente")

    __table_args__ = (
        UniqueConstraint('cuit', 'tenant_id', name='uq_cliente_cuit_tenant'),
    )
