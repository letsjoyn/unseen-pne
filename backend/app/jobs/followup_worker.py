"""Lightweight follow-up worker. In prod this is a Cloud Run Job + Cloud Scheduler.

For the hackathon, you can call this entrypoint from cron / docker-compose
to advance any due tasks.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import Case, CaseEvent, FollowupTask
from app.logging_setup import configure_logging, get_logger


def process_due_tasks(db: Session) -> dict[str, int]:
    now = datetime.now(tz=timezone.utc)
    due = (
        db.query(FollowupTask)
        .filter(FollowupTask.status == "pending", FollowupTask.due_at <= now)
        .all()
    )
    advanced = 0
    escalated = 0
    for task in due:
        case = db.get(Case, task.case_id)
        if case is None:
            task.status = "cancelled"
            continue
        if task.task_type == "escalation_if_no_response":
            case.status = "escalated"
            escalated += 1
            db.add(
                CaseEvent(
                    case_id=case.id,
                    event_type="case.escalated",
                    actor="watchdog",
                    payload={"task_id": task.id},
                )
            )
        else:
            db.add(
                CaseEvent(
                    case_id=case.id,
                    event_type="followup.fired",
                    actor="watchdog",
                    payload={"task_id": task.id, "type": task.task_type},
                )
            )
        task.status = "done"
        advanced += 1
    db.commit()
    return {"due": len(due), "advanced": advanced, "escalated": escalated}


def main() -> None:
    configure_logging()
    log = get_logger("followup_worker")
    with SessionLocal() as db:
        result = process_due_tasks(db)
        log.info("followup_worker_done", **result)


if __name__ == "__main__":
    main()
