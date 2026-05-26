from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class CajaDiaria(Base):
    __tablename__ = "cajas_diarias"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    usuario_apertura_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    usuario_cierre_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    fecha_apertura = Column(DateTime, server_default=func.now(), nullable=False)
    fecha_cierre = Column(DateTime, nullable=True)
    monto_apertura = Column(Float, nullable=False, default=0.0)
    monto_cierre = Column(Float, nullable=True)
    estado = Column(String(20), default="ABIERTA")  # "ABIERTA", "CERRADA"
    observaciones_apertura = Column(Text, nullable=True)
    observaciones_cierre = Column(Text, nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="cajas")
    usuario_apertura = relationship("Usuario", foreign_keys=[usuario_apertura_id])
    usuario_cierre = relationship("Usuario", foreign_keys=[usuario_cierre_id])
    movimientos = relationship("MovimientoCaja", back_populates="caja_diaria", cascade="all, delete-orphan")

class MovimientoCaja(Base):
    __tablename__ = "movimientos_caja"

    id = Column(Integer, primary_key=True, index=True)
    caja_diaria_id = Column(Integer, ForeignKey("cajas_diarias.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    
    # "INGRESO", "EGRESO", "GASTO", "PAGO_PROVEEDOR", "PAGO_EMPLEADO", "ADELANTO_EMPLEADO"
    tipo = Column(String(50), nullable=False)  
    monto = Column(Float, nullable=False)
    descripcion = Column(Text, nullable=False)
    fecha = Column(DateTime, server_default=func.now(), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)  # Quien registra
    empleado_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)  # Empleado receptor (si aplica)
    proveedor_nombre = Column(String(200), nullable=True)  # Nombre del proveedor (si aplica)

    # Relationships
    caja_diaria = relationship("CajaDiaria", back_populates="movimientos")
    tenant = relationship("Tenant")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    empleado = relationship("Usuario", foreign_keys=[empleado_id])
