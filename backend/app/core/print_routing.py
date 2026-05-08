"""Generate a last-mile print routing slip for high-DER residents.

The logic stays config-driven: the place directory and DER trigger threshold
come from policy rows instead of being hardcoded in route handlers.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.integrations.maps import find_print_hub
from app.registry import policy_registry

DEFAULT_PRINT_HUBS: list[dict[str, Any]] = [
    {
        "name": "Ward e-Seva Kiosk",
        "category": "common_service_centre",
        "district": "Bengaluru Urban",
        "state": "Karnataka",
        "address": "Ward office campus, public service desk",
        "maps_query": "common service centre near Bengaluru Urban",
        "open_hours": "09:00-18:00",
    },
    {
        "name": "Janata Stationery & Xerox",
        "category": "print_shop",
        "district": "Bengaluru Urban",
        "state": "Karnataka",
        "address": "Market road print lane",
        "maps_query": "xerox print shop near Bengaluru Urban",
        "open_hours": "08:30-20:00",
    },
]


def build_print_routing_slip(
    db: Session,
    *,
    case_id: str,
    beneficiary: dict[str, Any],
    der_score: float | None,
    packet_name: str,
) -> dict[str, Any] | None:
    threshold_cfg = policy_registry.get_policy(
        db,
        "routing",
        "print_routing",
        default={"der_threshold": 0.55, "allow_low_der_without_internet": True},
    )
    der_threshold = float(threshold_cfg.get("der_threshold", 0.55))
    allow_low_der_without_internet = bool(
        threshold_cfg.get("allow_low_der_without_internet", True)
    )

    needs_print_assist = (
        (der_score is not None and der_score >= der_threshold)
        or (
            allow_low_der_without_internet
            and not bool(beneficiary.get("internet_access", False))
            and not bool(beneficiary.get("smartphone_access", False))
        )
    )
    if not needs_print_assist:
        return None

    location = beneficiary.get("location") if isinstance(beneficiary, dict) else {}
    district = (location or {}).get("district")
    state = (location or {}).get("state")
    selected_hub = find_print_hub(location=location or {}) or _pick_print_hub(
        db,
        district=district,
        state=state,
    )

    return {
        "case_id": case_id,
        "packet_name": packet_name,
        "reason": _reason_label(der_score, beneficiary),
        "recommended_hub": selected_hub,
        "instructions": [
            "Call the hub before travel if the volunteer has network access.",
            "Carry the cover letter, checklist, and any available ID/document copies.",
            "Ask the hub to print one beneficiary copy and one volunteer working copy.",
        ],
        "handoff_mode": "volunteer_assisted_print",
    }


def _pick_print_hub(
    db: Session,
    *,
    district: str | None,
    state: str | None,
) -> dict[str, Any]:
    hubs = policy_registry.get_policy(
        db,
        "routing",
        "print_hubs",
        default=DEFAULT_PRINT_HUBS,
    )
    ranked = sorted(
        hubs,
        key=lambda hub: (
            0 if str(hub.get("district") or "").lower() == str(district or "").lower() else 1,
            0 if str(hub.get("state") or "").lower() == str(state or "").lower() else 1,
            str(hub.get("name") or ""),
        ),
    )
    return ranked[0] if ranked else DEFAULT_PRINT_HUBS[0]


def _reason_label(der_score: float | None, beneficiary: dict[str, Any]) -> str:
    if der_score is not None and der_score >= 0.75:
        return "Very high digital exclusion risk"
    if not bool(beneficiary.get("smartphone_access", False)):
        return "No smartphone access for digital delivery"
    if not bool(beneficiary.get("internet_access", False)):
        return "No reliable internet access for digital delivery"
    return "Volunteer-assisted printable handoff recommended"
