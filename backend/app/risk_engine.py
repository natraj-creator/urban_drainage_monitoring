"""
Risk scoring logic. See Section 6 of the build guide for the
underlying rules. History is kept in memory per node, which is
fine for a single-process prototype; a production version would
query recent Readings from the database instead.
"""

from collections import deque
from datetime import datetime, timedelta
from typing import Optional

_history: dict[str, deque] = {}

RATE_RISE_THRESHOLD = 5.0
PERSISTENCE_WINDOW_MIN = 15
PERSISTENCE_LEVEL = 80.0


def _get_node_history(node_id: str) -> deque:
    if node_id not in _history:
        _history[node_id] = deque(maxlen=50)
    return _history[node_id]


def compute_rate_of_rise(node_id: str, level: float, now: datetime) -> float:
    hist = _get_node_history(node_id)
    if not hist:
        return 0.0
    prev_time, prev_level = hist[-1]
    minutes = max((now - prev_time).total_seconds() / 60, 0.01)
    return (level - prev_level) / minutes


def check_persistence(node_id: str, now: datetime) -> bool:
    hist = _get_node_history(node_id)
    cutoff = now - timedelta(minutes=PERSISTENCE_WINDOW_MIN)
    recent = [lv for t, lv in hist if t >= cutoff]
    if len(recent) < 3:
        return False
    return all(lv >= PERSISTENCE_LEVEL for lv in recent)


def compute_status(
    node_id: str,
    level: float,
    rainfall_mm: Optional[float],
    now: Optional[datetime] = None,
) -> str:
    now = now or datetime.utcnow()
    rate = compute_rate_of_rise(node_id, level, now)
    persistent_high = check_persistence(node_id, now)

    _get_node_history(node_id).append((now, level))

    rapid = rate >= RATE_RISE_THRESHOLD
    low_rainfall = rainfall_mm is None or rainfall_mm < 1.0

    if persistent_high and low_rainfall:
        return "POSSIBLE_BLOCKAGE"
    if level > 95 or (rapid and level > 80):
        return "CRITICAL"
    if level >= 80:
        return "HIGH_RISK"
    if level >= 60:
        return "WARNING"
    return "NORMAL"
