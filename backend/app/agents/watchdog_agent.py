"""Watchdog agent: schedules follow-up tasks per follow-up policy."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from app.agents.base import BaseAgent
from app.db.models import Case, FollowupTask
from app.registry import policy_registry, scheme_registry

DEFAULT_CADENCE = [
    {"due_in_days": 3, "type": "status_check"},
    {"due_in_days": 7, "type": "reminder"},
    {"due_in_days": 14, "type": "escalation_if_no_response"},
]


class WatchdogAgent(BaseAgent):
    name = "watchdog"

    def run(self, *, case_id: str, scheme_id: str | None = None, **_: Any) -> dict[str, Any]:
        case = self.db.get(Case, case_id)
        if case is None:
            raise ValueError("Case missing")

        cadence_key = "default"
        if scheme_id:
            scheme = scheme_registry.get_scheme(self.db, scheme_id)
            if scheme:
                cadence_key = scheme.category or "default"

        cadence = policy_registry.get_policy(
            self.db, "followup", cadence_key, default=DEFAULT_CADENCE
        )
        if not isinstance(cadence, list) or not cadence:
            cadence = DEFAULT_CADENCE

        self.db.query(FollowupTask).filter(
            FollowupTask.case_id == case_id, FollowupTask.status == "pending"
        ).delete()

        now = datetime.now(tz=timezone.utc)
        created = []
        for entry in cadence:
            due = now + timedelta(days=int(entry.get("due_in_days", 3)))
            task = FollowupTask(
                case_id=case_id,
                due_at=due,
                task_type=str(entry.get("type", "status_check")),
                status="pending",
            )
            self.db.add(task)
            created.append({"due_in_days": entry.get("due_in_days"), "type": entry.get("type")})

        case.status = "in_progress"
        self.db.commit()

        out = {"tasks": created, "policy_key": cadence_key}
        self.record_event(case_id, out)
        return out
