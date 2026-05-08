"""WhatsApp adapter (stub by default; pluggable provider)."""

from __future__ import annotations

import httpx

from app.config import get_settings
from app.logging_setup import get_logger

log = get_logger(__name__)


def send_whatsapp(*, to: str, body: str) -> dict:
    settings = get_settings()
    provider = settings.whatsapp_provider.lower()
    if provider == "stub" or not settings.whatsapp_api_key:
        log.info("whatsapp_stub_send", to=to, body=body[:80])
        return {"status": "stubbed", "to": to}

    if provider == "twilio":
        url = "https://api.twilio.com/2010-04-01/Accounts/.../Messages.json"
        with httpx.Client(timeout=10.0) as client:
            r = client.post(
                url,
                data={"From": settings.whatsapp_from, "To": f"whatsapp:{to}", "Body": body},
                headers={"Authorization": f"Bearer {settings.whatsapp_api_key}"},
            )
            return {"status": "sent", "code": r.status_code}

    log.warning("whatsapp_unknown_provider", provider=provider)
    return {"status": "unknown_provider"}
