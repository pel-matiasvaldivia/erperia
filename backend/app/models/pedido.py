from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.core.database import Base

class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    administrativo_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha = Column(DateTime, default=func.now(), index=True)
    estado = Column(String, default="Pendiente de preparación", index=True) 
    # Estados: "Pendiente de preparación", "En preparación", "Listo para despacho", "Facturado/Remitido", "En reparto", "Entregado", "Entrega parcial", "No entregado"
    observaciones = Column(String, nullable=True)
    total = Column(Float, default=0.0)

    # Relationships
    tenant = relationship("Tenant", back_populates="pedidos")
    cliente = relationship("Cliente", back_populates="pedidos")
    administrativo = relationship("Usuario")
    items = relationship("PedidoItem", back_populates="pedido", cascade="all, delete-orphan")
    orden_preparacion = relationship("OrdenPreparacion", back_populates="pedido", uselist=False, cascade="all, delete-orphan")
    comprobantes = relationship("Comprobante", back_populates="pedido", cascade="all, delete-orphan")

class PedidoItem(Base):
    __tablename__ = "pedido_items"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad_unidades = Column(Float, default=0.0)
    peso_estimado_kg = Column(Float, default=0.0)
    peso_real_kg = Column(Float, default=0.0)
    precio_unitario = Column(Float, default=0.0) # Precio por kg fijado en la creación
    subtotal = Column(Float, default=0.0)

    # Relationships
    pedido = relationship("Pedido", back_populates="items")
    producto = relationship("Producto", back_populates="pedido_items")
