"""Action packet approval + send (the human-in-the-loop gate)."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import schemas
from app.api.deps import get_db, require_auth
from app.core.print_routing import build_print_routing_slip
from app.db import models
from app.integrations.email import send_email
from app.integrations.whatsapp import send_whatsapp

router = APIRouter(prefix="/api/action-packets", tags=["action-packets"])


def _format_print_slip_message(case_id: str, slip: dict) -> str:
    hub = slip.get("recommended_hub") or {}
    lines = [
        f"Unseen PNE print routing for case {case_id}",
        f"Reason: {slip.get('reason')}",
        f"Hub: {hub.get('name') or 'Nearby print hub'}",
    ]
    if hub.get("address"):
        lines.append(f"Address: {hub['address']}")
    if hub.get("open_hours"):
        lines.append(f"Open: {hub['open_hours']}")
    if hub.get("maps_query"):
        lines.append(f"Maps search: {hub['maps_query']}")
    instructions = slip.get("instructions") or []
    if instructions:
        lines.append("Steps:")
        lines.extend(f"- {step}" for step in instructions)
    return "\n".join(lines)


@router.post("/{case_id}/approve-send")
def approve_and_send(
    case_id: str,
    payload: schemas.ApprovePacketRequest,
    db: Session = Depends(get_db),
    _: str = Depends(require_auth),
):
    packet = db.get(models.ActionPacket, case_id)
    case = db.get(models.Case, case_id)
    if packet is None or case is None:
        raise HTTPException(404, "Packet or case not found")

    packet.approved = True
    packet.approved_by = payload.approved_by
    packet.approved_at = datetime.now(tz=timezone.utc)

    sent_channels: list[str] = []
    intake = case.intake_payload or {}
    beneficiary = intake.get("beneficiary", {})
    receiver_email = beneficiary.get("email") or "ops@unseen.local"
    receiver_phone = beneficiary.get("phone") or "+910000000000"
    profile = db.get(models.BeneficiaryProfile, case_id)
    print_routing_slip = None
    print_slip_delivery = None

    for ch in payload.channels:
        if ch == "email":
            send_email(to=receiver_email, subject=packet.email_subject, body=packet.email_body)
            sent_channels.append("email")
        elif ch == "whatsapp":
            send_whatsapp(to=receiver_phone, body=packet.whatsapp_summary or packet.email_body)
            sent_channels.append("whatsapp")
        elif ch == "printable_letter":
            sent_channels.append("printable_letter")
            print_routing_slip = build_print_routing_slip(
                db,
                case_id=case_id,
                beneficiary=beneficiary,
                der_score=profile.der_score if profile else None,
                packet_name=packet.email_subject,
            )
            if print_routing_slip is not None:
                print_slip_delivery = send_whatsapp(
                    to=receiver_phone,
                    body=_format_print_slip_message(case_id, print_routing_slip),
                )

    packet.sent = True
    packet.sent_channels = sent_channels
    case.status = "packet_dispatched"

    db.add(
        models.CaseEvent(
            case_id=case_id,
            event_type="packet.approved_sent",
            actor=payload.approved_by,
            payload={
                "channels": sent_channels,
                "print_routing_slip": print_routing_slip,
                "print_slip_delivery": print_slip_delivery,
            },
        )
    )
    db.commit()
    return {
        "status": "sent",
        "channels": sent_channels,
        "print_routing_slip": print_routing_slip,
        "print_slip_delivery": print_slip_delivery,
    }
