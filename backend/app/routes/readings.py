from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..risk_engine import compute_status
from ..ws_manager import manager

router = APIRouter(prefix="/api/readings", tags=["readings"])


@router.post("", response_model=schemas.ReadingOut)
async def ingest_reading(
    payload: schemas.ReadingIn,
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()

    node = db.query(models.Node).filter(models.Node.id == payload.node_id).first()
    if node is None:
        node = models.Node(id=payload.node_id, name=payload.node_id)
        db.add(node)

    status = compute_status(
        payload.node_id, payload.water_level_pct, payload.rainfall_mm, now
    )

    reading = models.Reading(
        node_id=payload.node_id,
        timestamp=now,
        water_level_pct=payload.water_level_pct,
        rainfall_mm=payload.rainfall_mm,
        battery_pct=payload.battery_pct,
        status=status,
    )
    db.add(reading)

    node.last_seen = now
    if payload.battery_pct is not None:
        node.battery_pct = payload.battery_pct

    if status in ("HIGH_RISK", "CRITICAL", "POSSIBLE_BLOCKAGE"):
        alert = models.Alert(
            node_id=payload.node_id,
            timestamp=now,
            level=status,
            message=(
                f"{payload.node_id} reported {status} "
                f"at {payload.water_level_pct:.1f}%"
            ),
        )
        db.add(alert)

    db.commit()
    db.refresh(reading)

    await manager.broadcast({
        "type": "reading",
        "node_id": payload.node_id,
        "level": payload.water_level_pct,
        "status": status,
        "timestamp": now.isoformat(),
    })

    return reading
