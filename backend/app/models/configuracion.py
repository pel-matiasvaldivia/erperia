from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base

class ConfiguracionSistema(Base):
    __tablename__ = "configuracion_sistema"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    clave = Column(String, index=True, nullable=False)
    valor = Column(String, nullable=False)
    modulo = Column(String, nullable=True) # e.g. "Ventas", "Cuentas Corrientes", "General"
    descripcion = Column(String, nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="configuraciones")

    __table_args__ = (
        UniqueConstraint('clave', 'tenant_id', name='uq_config_clave_tenant'),
    )
