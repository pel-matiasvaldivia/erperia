from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base

class Comprobante(Base):
    __tablename__ = "comprobantes"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String, nullable=False)  # "FACTURA", "REMITO"
    numero = Column(String, index=True, nullable=False)
    fecha = Column(DateTime, default=func.now(), index=True)
    total = Column(Float, default=0.0)
    pdf_path = Column(String, nullable=True)
    estado = Column(String, default="Emitido")  # "Emitido", "Cobrado", "Anulado"
    firma_repartidor_path = Column(String, nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="comprobantes")
    pedido = relationship("Pedido", back_populates="comprobantes")

    __table_args__ = (
        UniqueConstraint('numero', 'tenant_id', name='uq_comprobante_numero_tenant'),
    )
