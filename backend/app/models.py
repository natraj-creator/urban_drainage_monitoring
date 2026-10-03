from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class Node(Base):
    __tablename__ = "nodes"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    battery_pct = Column(Float, default=100.0)
    last_seen = Column(DateTime, default=datetime.utcnow)

    readings = relationship(
        "Reading", back_populates="node", cascade="all, delete-orphan"
    )
    alerts = relationship(
        "Alert", back_populates="node", cascade="all, delete-orphan"
    )


class Reading(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, ForeignKey("nodes.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    water_level_pct = Column(Float, nullable=False)
    rainfall_mm = Column(Float, nullable=True)
    battery_pct = Column(Float, nullable=True)
    status = Column(String, default="NORMAL")

    node = relationship("Node", back_populates="readings")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, ForeignKey("nodes.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    level = Column(String, nullable=False)
    message = Column(String, nullable=False)
    resolved = Column(Boolean, default=False)

    node = relationship("Node", back_populates="alerts")
