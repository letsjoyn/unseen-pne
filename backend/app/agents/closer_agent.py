"""Closer agent: generates the action packet (cover letter / email / checklist)."""

from __future__ import annotations

from typing import Any

from app.agents.base import BaseAgent
from app.agents.profiler_agent import _flatten_profile
from app.db.models import ActionPacket, BeneficiaryProfile, BlockerReport, Case, Match
from app.registry import scheme_registry


class CloserAgent(BaseAgent):
    name = "closer"

    def run(self, *, case_id: str, scheme_id: str | None = None, **_: Any) -> dict[str, Any]:
        case = self.db.get(Case, case_id)
        profile_row = self.db.get(BeneficiaryProfile, case_id)
        if case is None or profile_row is None:
            raise ValueError("Case/profile missing")

        match = self._pick_match(case_id, scheme_id)
        if match is None:
            raise ValueError("No suitable match; run matcher first")

        scheme = scheme_registry.get_scheme(self.db, match.scheme_id)
        if scheme is None:
            raise ValueError("Scheme not found")

        blocker = (
            self.db.query(BlockerReport)
            .filter(BlockerReport.case_id == case_id, BlockerReport.scheme_id == scheme.id)
            .one_or_none()
        )

        flat = _flatten_profile(profile_row.profile_json, case.intake_payload)

        prompt = self.load_prompt()
        ai = self.gemini.generate_json(
            prompt=prompt,
            user_payload={
                "scheme": {
                    "name": scheme.name,
                    "category": scheme.category,
                    "required_documents": scheme.required_documents,
                    "summary": scheme.summary,
                },
                "profile": flat,
                "blockers": (blocker.blockers if blocker else []),
            },
        )

        cover_letter = (ai.get("cover_letter") or "").strip() or _fallback_cover(flat, scheme)
        email_subject = (
            (ai.get("email_subject") or "").strip()
            or f"Application support: {scheme.name} - {flat.get('demographics', {}).get('name') or case.id}"
        )
        email_body = (ai.get("email_body") or "").strip() or _fallback_email(flat, scheme)
        whatsapp = (ai.get("whatsapp_summary") or "").strip()
        checklist = ai.get("checklist") or list(scheme.required_documents or [])

        existing = self.db.get(ActionPacket, case_id)
        if existing is None:
            self.db.add(
                ActionPacket(
                    case_id=case_id,
                    scheme_id=scheme.id,
                    cover_letter=cover_letter,
                    email_subject=email_subject,
                    email_body=email_body,
                    whatsapp_summary=whatsapp,
                    checklist=checklist,
                    requires_human_approval=True,
                    approved=False,
                    sent=False,
                )
            )
        else:
            existing.scheme_id = scheme.id
            existing.cover_letter = cover_letter
            existing.email_subject = email_subject
            existing.email_body = email_body
            existing.whatsapp_summary = whatsapp
            existing.checklist = checklist
            existing.requires_human_approval = True
            existing.approved = False
            existing.sent = False

        case.status = "packet_ready"
        self.db.commit()

        out = {
            "scheme_id": scheme.id,
            "packet": {
                "cover_letter": cover_letter,
                "email_subject": email_subject,
                "email_body": email_body,
                "whatsapp_summary": whatsapp,
                "checklist": checklist,
            },
            "requires_human_approval": True,
        }
        self.record_event(case_id, {"packet_for": scheme.id})
        return out

    def _pick_match(self, case_id: str, scheme_id: str | None) -> Match | None:
        q = self.db.query(Match).filter(Match.case_id == case_id)
        if scheme_id:
            return q.filter(Match.scheme_id == scheme_id).one_or_none()
        return q.filter(Match.eligibility.in_(["eligible", "probable"])).order_by(Match.score.desc()).first()


def _fallback_cover(flat: dict[str, Any], scheme: Any) -> str:
    name = (flat.get("demographics") or {}).get("name") or "the applicant"
    return (
        f"To,\nThe Concerned Officer,\n\n"
        f"Subject: Application for {scheme.name}\n\n"
        f"This letter is filed on behalf of {name}, who appears eligible under the "
        f"provisions of the {scheme.name} programme. Required documents and the "
        f"applicant's profile summary are enclosed.\n\n"
        f"Kindly process this application at the earliest.\n\n"
        f"Regards,\nUnseen PNE Volunteer (DRAFT - awaiting human approval)"
    )


def _fallback_email(flat: dict[str, Any], scheme: Any) -> str:
    name = (flat.get("demographics") or {}).get("name") or "the applicant"
    return (
        f"Dear Sir/Madam,\n\n"
        f"Please find attached an application packet for {name} under the "
        f"{scheme.name} programme. Documentation and eligibility evidence are "
        f"included. We request your review and acknowledgement.\n\n"
        f"Regards,\nUnseen PNE Community Desk\n(DRAFT - awaiting human approval)"
    )
