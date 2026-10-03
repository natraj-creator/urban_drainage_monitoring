from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/nodes", tags=["nodes"])


@router.get("", response_model=list[schemas.NodeOut])
def list_nodes(db: Session = Depends(get_db)):
    nodes = db.query(models.Node).all()
    result = []
    for n in nodes:
        latest = (
            db.query(models.Reading)
            .filter(models.Reading.node_id == n.id)
            .order_by(desc(models.Reading.timestamp))
            .first()
        )
        result.append(
            schemas.NodeOut(
                id=n.id,
                name=n.name,
                location=n.location,
                battery_pct=n.battery_pct,
                last_seen=n.last_seen,
                latest_level=latest.water_level_pct if latest else None,
                status=latest.status if latest else "UNKNOWN",
            )
        )
    return result


@router.get("/{node_id}/history", response_model=list[schemas.ReadingOut])
def node_history(
    node_id: str,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    readings = (
        db.query(models.Reading)
        .filter(models.Reading.node_id == node_id)
        .order_by(desc(models.Reading.timestamp))
        .limit(limit)
        .all()
    )
    if not readings:
        raise HTTPException(404, "No readings for this node")
    return list(reversed(readings))
