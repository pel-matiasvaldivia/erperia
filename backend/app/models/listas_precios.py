from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.core.database import Base

class ListaPrecios(Base):
    __tablename__ = "listas_precios"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    nombre = Column(String, nullable=False, index=True)
    descripcion = Column(String, nullable=True)
    activa = Column(Boolean, default=True)
    fecha_actualizacion = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="listas_precios")
    detalles = relationship("ListaPreciosDetalle", back_populates="lista_precios", cascade="all, delete-orphan")
    clientes = relationship("Cliente", back_populates="lista_precios")

class ListaPreciosDetalle(Base):
    __tablename__ = "lista_precios_detalle"

    id = Column(Integer, primary_key=True, index=True)
    lista_precios_id = Column(Integer, ForeignKey("listas_precios.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False)
    precio_costo = Column(Float, default=0.0)
    precio_venta = Column(Float, default=0.0)
    precio_mayoreo = Column(Float, default=0.0)
    stock = Column(Float, default=0.0)
    stock_minimo = Column(Float, default=0.0)

    # Relationships
    lista_precios = relationship("ListaPrecios", back_populates="detalles")
    producto = relationship("Producto", back_populates="detalles")
