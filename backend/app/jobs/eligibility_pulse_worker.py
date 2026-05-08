"""Nightly eligibility pulse worker.

Re-runs matching for open cases and flags newly eligible opportunities.
"""

from __future__ import annotations

from app.core.eligibility_pulse import run_living_eligibility_pulse
from app.db.database import SessionLocal
from app.logging_setup import configure_logging, get_logger


def main() -> None:
    configure_logging()
    log = get_logger("eligibility_pulse_worker")
    with SessionLocal() as db:
        result = run_living_eligibility_pulse(db)
        log.info("eligibility_pulse_done", **result)


if __name__ == "__main__":
    main()
