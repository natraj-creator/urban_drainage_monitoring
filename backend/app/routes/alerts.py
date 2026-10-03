from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=list[schemas.AlertOut])
def list_alerts(resolved: bool | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Alert)
    if resolved is not None:
        q = q.filter(models.Alert.resolved == resolved)
    return q.order_by(desc(models.Alert.timestamp)).limit(200).all()


@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).get(alert_id)
    if alert:
        alert.resolved = True
        db.commit()
    return {"ok": True}
