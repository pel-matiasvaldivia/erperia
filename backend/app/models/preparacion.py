from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import relationship

from app.core.database import Base

class OrdenPreparacion(Base):
    __tablename__ = "ordenes_preparacion"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), unique=True, nullable=False)
    ruta_id = Column(Integer, ForeignKey("rutas.id"), nullable=True)
    fecha_despacho = Column(DateTime, default=func.now(), index=True)
    estado = Column(String, default="Pendiente")  # "Pendiente", "En preparación", "Completado"
    observaciones = Column(String, nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="ordenes_preparacion")
    pedido = relationship("Pedido", back_populates="orden_preparacion")
    ruta = relationship("Ruta", back_populates="ordenes_preparacion")
    bultos = relationship("OrdenPreparacionBulto", back_populates="orden", cascade="all, delete-orphan")

class OrdenPreparacionBulto(Base):
    __tablename__ = "orden_preparacion_bultos"

    id = Column(Integer, primary_key=True, index=True)
    orden_id = Column(Integer, ForeignKey("ordenes_preparacion.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    unidades = Column(Float, default=0.0)
    peso_estimado_kg = Column(Float, default=0.0)
    peso_real_kg = Column(Float, default=0.0)
    confirmado = Column(Boolean, default=False)
    
    # Traceability
    tracking_uuid = Column(String, unique=True, index=True, nullable=True)
    estado_logistico = Column(String, default="PREPARADO")  # "PREPARADO", "CARGADO", "ENTREGADO"
    fecha_carga = Column(DateTime, nullable=True)
    fecha_entrega = Column(DateTime, nullable=True)

    # Relationships
    orden = relationship("OrdenPreparacion", back_populates="bultos")
    producto = relationship("Producto", back_populates="bultos")
