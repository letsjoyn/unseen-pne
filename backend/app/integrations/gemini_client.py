"""Thin wrapper around google-genai for structured JSON outputs.

If no API key is configured we fall back to a deterministic stub so the
backend boots and is testable without keys (useful for the hackathon
demo and CI). All real reasoning still flows through this client when a
key is set.
"""

from __future__ import annotations

import json
from typing import Any

from app.config import get_settings
from app.logging_setup import get_logger

log = get_logger(__name__)


class GeminiClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client = None
        self._init_client()

    def _init_client(self) -> None:
        if not self.settings.google_api_key and not self.settings.google_genai_use_vertexai:
            log.warning("gemini_no_credentials_using_stub")
            return
        try:
            from google import genai

            if self.settings.google_genai_use_vertexai:
                self._client = genai.Client(
                    vertexai=True,
                    project=self.settings.google_cloud_project,
                    location=self.settings.google_cloud_location,
                )
            else:
                self._client = genai.Client(api_key=self.settings.google_api_key)
        except Exception as exc:  # pragma: no cover - defensive
            log.warning("gemini_init_failed", error=str(exc))
            self._client = None

    @property
    def is_live(self) -> bool:
        return self._client is not None

    def generate_json(
        self,
        *,
        prompt: str,
        user_payload: dict[str, Any] | str,
        model: str | None = None,
        temperature: float = 0.2,
    ) -> dict[str, Any]:
        """Generate a JSON-only response. Falls back to a deterministic stub if no client."""

        if self._client is None:
            return _stub_response(prompt, user_payload)

        model = model or self.settings.gemini_model_reasoning
        body = (
            user_payload
            if isinstance(user_payload, str)
            else json.dumps(user_payload, ensure_ascii=False)
        )
        contents = (
            f"{prompt}\n\nINPUT (JSON):\n{body}\n\n"
            "Respond with valid JSON only. Do not wrap in code fences."
        )

        try:
            response = self._client.models.generate_content(
                model=model,
                contents=contents,
                config={
                    "response_mime_type": "application/json",
                    "temperature": temperature,
                },
            )
            text = (response.text or "").strip()
            return _safe_json(text)
        except Exception as exc:
            log.warning("gemini_generation_failed", error=str(exc))
            return _stub_response(prompt, user_payload)


def _safe_json(text: str) -> dict[str, Any]:
    if not text:
        return {}
    if text.startswith("```"):
        lines = [l for l in text.splitlines() if not l.startswith("```")]
        text = "\n".join(lines)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            data = json.loads(text[start : end + 1])
        else:
            data = {"_raw": text}
    return data if isinstance(data, dict) else {"result": data}


def _stub_response(prompt: str, payload: dict[str, Any] | str) -> dict[str, Any]:
    """Deterministic placeholder when no credentials are configured.

    Each agent's stub key is detected from the prompt header.
    """

    head = (prompt[:120] or "").lower()
    if "profiler" in head:
        intake = payload if isinstance(payload, dict) else {}
        b = intake.get("beneficiary", {})
        return {
            "demographics": {
                "name": b.get("name"),
                "age": b.get("age"),
                "gender": b.get("gender"),
            },
            "economic": {
                "monthly_income": b.get("monthly_income"),
                "occupation": b.get("occupation"),
            },
            "household": {"size": b.get("household_size"), "dependents": b.get("dependents")},
            "documents": {d: True for d in (b.get("documents_available") or [])},
            "location": b.get("location", {}),
            "vulnerability_tags": _infer_tags(b),
            "missing_fields": [k for k in ("monthly_income", "age") if not b.get(k)],
            "confidence": 0.7,
        }
    if "closer" in head:
        return {
            "cover_letter": "To the concerned authority,\n\nI am writing on behalf of the applicant... [DRAFT]",
            "email_subject": "Application support - draft for human approval",
            "email_body": "Dear Sir/Madam,\n\n[DRAFT - awaiting human approval]\n\nRegards,",
            "whatsapp_summary": "Draft application packet ready for review.",
            "checklist": ["Aadhaar", "Income Certificate", "Bank Passbook"],
        }
    if "validator" in head:
        return {
            "blockers": [
                {
                    "type": "MISSING_DOCUMENT",
                    "description": "Awaiting verification",
                    "required_items": [],
                    "next_steps": ["Verify document availability with beneficiary"],
                }
            ],
            "minimum_path_to_submission": [
                "Confirm available documents",
                "Acquire any missing documents",
                "Submit application",
            ],
        }
    return {"_stub": True}


def _infer_tags(b: dict[str, Any]) -> list[str]:
    tags: list[str] = []
    if b.get("is_widow"):
        tags.append("widow")
    if (b.get("monthly_income") or 0) and b["monthly_income"] <= 12000:
        tags.append("low_income")
    if not b.get("smartphone_access"):
        tags.append("digital_exclusion_risk_high")
    return tags
