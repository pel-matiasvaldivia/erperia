from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime, Text
from sqlalchemy.orm import relationship

from app.core.database import Base

class Ruta(Base):
    __tablename__ = "rutas"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    nombre = Column(String, nullable=False, index=True)
    zona = Column(String, nullable=True)
    dias_reparto = Column(String, nullable=True) # e.g. "Lunes,Miércoles,Viernes" or JSON
    repartidor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    # Route Optimization metrics
    waypoints_geojson = Column(Text, nullable=True)
    distancia_total_km = Column(Float, nullable=True)
    tiempo_estimado_min = Column(Integer, nullable=True)
    ultima_optimizacion = Column(DateTime, nullable=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="rutas")
    repartidor = relationship("Usuario")
    clientes = relationship("Cliente", back_populates="ruta")
    ordenes_preparacion = relationship("OrdenPreparacion", back_populates="ruta")
