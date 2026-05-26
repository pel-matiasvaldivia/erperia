from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    nombre = Column(String, nullable=False)
    email = Column(String, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    rol = Column(String, nullable=False)  # PLATFORM_ADMIN, TENANT_ADMIN, ADMINISTRATIVO, VENDEDOR, REPARTIDOR, CLIENTE
    activo = Column(Boolean, default=True)
    debe_cambiar_password = Column(Boolean, default=False, nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="usuarios")
    clientes = relationship("Cliente", back_populates="usuario")

    __table_args__ = (
        UniqueConstraint('email', 'tenant_id', name='uq_usuario_email_tenant'),
    )
