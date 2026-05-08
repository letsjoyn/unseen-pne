"""Action packet approval + send (the human-in-the-loop gate)."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import schemas
from app.api.deps import get_db, require_auth
from app.db import models
from app.integrations.email import send_email
from app.integrations.whatsapp import send_whatsapp

router = APIRouter(prefix="/api/action-packets", tags=["action-packets"])


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

    for ch in payload.channels:
        if ch == "email":
            send_email(to=receiver_email, subject=packet.email_subject, body=packet.email_body)
            sent_channels.append("email")
        elif ch == "whatsapp":
            send_whatsapp(to=receiver_phone, body=packet.whatsapp_summary or packet.email_body)
            sent_channels.append("whatsapp")
        elif ch == "printable_letter":
            sent_channels.append("printable_letter")

    packet.sent = True
    packet.sent_channels = sent_channels
    case.status = "packet_dispatched"

    db.add(
        models.CaseEvent(
            case_id=case_id,
            event_type="packet.approved_sent",
            actor=payload.approved_by,
            payload={"channels": sent_channels},
        )
    )
    db.commit()
    return {"status": "sent", "channels": sent_channels}
