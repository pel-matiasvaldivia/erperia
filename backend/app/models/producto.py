from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base

class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    codigo = Column(String, index=True, nullable=False)
    descripcion = Column(String, nullable=False, index=True)
    departamento = Column(String, nullable=True) # Cortes frescos, Elaborados, Fiambres, Especiales
    activo = Column(Boolean, default=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="productos")
    detalles = relationship("ListaPreciosDetalle", back_populates="producto", cascade="all, delete-orphan")
    pedido_items = relationship("PedidoItem", back_populates="producto")
    bultos = relationship("OrdenPreparacionBulto", back_populates="producto")

    __table_args__ = (
        UniqueConstraint('codigo', 'tenant_id', name='uq_producto_codigo_tenant'),
    )
