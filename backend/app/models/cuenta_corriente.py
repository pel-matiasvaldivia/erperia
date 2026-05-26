from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.core.database import Base

class CuentaCorriente(Base):
    __tablename__ = "cuentas_corrientes"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id", ondelete="CASCADE"), unique=True, nullable=False)
    saldo_actual = Column(Float, default=0.0)
    limite_credito = Column(Float, default=0.0)
    fecha_actualizacion = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="cuentas_corrientes")
    cliente = relationship("Cliente", back_populates="cuenta_corriente")
    movimientos = relationship("MovimientoCC", back_populates="cuenta", cascade="all, delete-orphan")

class MovimientoCC(Base):
    __tablename__ = "movimientos_cc"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    cuenta_id = Column(Integer, ForeignKey("cuentas_corrientes.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String, nullable=False)  # "DEBITO" (aumenta saldo/deuda), "CREDITO" (pago realizado, disminuye saldo/deuda)
    monto = Column(Float, nullable=False)
    referencia = Column(String, nullable=True)  # e.g., "FC-0001-00000001", "RECIBO-0239"
    fecha = Column(DateTime, default=func.now(), index=True)
    descripcion = Column(String, nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="movimientos_cc")
    cuenta = relationship("CuentaCorriente", back_populates="movimientos")
