"""SMTP adapter. Falls back to a no-op stub when SMTP isn't configured."""

from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.config import get_settings
from app.logging_setup import get_logger

log = get_logger(__name__)


def send_email(*, to: str, subject: str, body: str) -> dict:
    settings = get_settings()
    if not settings.smtp_host or not settings.smtp_username:
        log.info("email_stub_send", to=to, subject=subject)
        return {"status": "stubbed", "to": to, "subject": subject}

    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_username, settings.smtp_password or "")
        server.send_message(msg)

    log.info("email_sent", to=to, subject=subject)
    return {"status": "sent", "to": to, "subject": subject}
