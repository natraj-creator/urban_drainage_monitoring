from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ReadingIn(BaseModel):
    node_id: str
    water_level_pct: float
    rainfall_mm: Optional[float] = None
    battery_pct: Optional[float] = None


class ReadingOut(ReadingIn):
    id: int
    timestamp: datetime
    status: str

    class Config:
        from_attributes = True


class NodeOut(BaseModel):
    id: str
    name: str
    location: Optional[str] = None
    battery_pct: float
    last_seen: datetime
    latest_level: Optional[float] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


class AlertOut(BaseModel):
    id: int
    node_id: str
    timestamp: datetime
    level: str
    message: str
    resolved: bool

    class Config:
        from_attributes = True
