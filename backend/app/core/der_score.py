"""Digital Exclusion Risk (DER) scoring.

The weights are loaded from the `der` confidence/feature policy so they
can be tuned without a code deploy.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.registry import policy_registry

DEFAULT_WEIGHTS: dict[str, float] = {
    "no_smartphone": 0.30,
    "no_bank_linked": 0.20,
    "low_literacy": 0.20,
    "no_digital_id": 0.15,
    "no_internet": 0.15,
}


def compute_der(profile: dict[str, Any], db: Session | None = None) -> float:
    weights = DEFAULT_WEIGHTS
    if db is not None:
        cfg = policy_registry.get_policy(db, "confidence", "der_weights")
        if isinstance(cfg, dict) and cfg:
            weights = {**DEFAULT_WEIGHTS, **cfg}

    indicators = {
        "no_smartphone": not bool(profile.get("smartphone_access", False)),
        "no_bank_linked": not bool(profile.get("bank_linked", False)),
        "low_literacy": (profile.get("literacy_level") or "").lower() in {"low", "none"},
        "no_digital_id": not bool(profile.get("documents", {}).get("aadhaar")),
        "no_internet": not bool(profile.get("internet_access", False)),
    }
    score = 0.0
    for key, weight in weights.items():
        if indicators.get(key):
            score += weight
    return round(min(1.0, score), 3)
