"""Confidence threshold gate (loads thresholds from policy registry)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.registry import policy_registry

DEFAULTS = {
    "profile": 0.55,
    "match": 0.60,
    "blocker": 0.50,
    "packet": 0.65,
}


def threshold(db: Session, stage: str) -> float:
    cfg = policy_registry.get_policy(db, "confidence", "thresholds")
    if isinstance(cfg, dict) and stage in cfg:
        try:
            return float(cfg[stage])
        except (TypeError, ValueError):
            pass
    return DEFAULTS.get(stage, 0.5)


def passes(db: Session, stage: str, value: float) -> bool:
    return value >= threshold(db, stage)
