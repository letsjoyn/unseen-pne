"""Estimated Missed Benefits Value calculator.

Sums `estimated_annual_value_inr` for schemes the beneficiary is
eligible/probable for but has not yet claimed (no approved+sent packet).
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models import ActionPacket, Match, Scheme


def estimate_missed_value_for_case(db: Session, case_id: str) -> int:
    matches = (
        db.query(Match)
        .filter(Match.case_id == case_id)
        .filter(Match.eligibility.in_(["eligible", "probable"]))
        .all()
    )
    if not matches:
        return 0
    sent_scheme = None
    packet = db.query(ActionPacket).filter(ActionPacket.case_id == case_id).one_or_none()
    if packet and packet.sent:
        sent_scheme = packet.scheme_id
    total = 0
    for m in matches:
        if m.scheme_id == sent_scheme:
            continue
        scheme = db.get(Scheme, m.scheme_id)
        if scheme and scheme.estimated_annual_value_inr:
            weight = 1.0 if m.eligibility == "eligible" else 0.5
            total += int(scheme.estimated_annual_value_inr * weight)
    return total
