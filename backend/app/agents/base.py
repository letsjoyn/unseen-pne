"""Base class for all agents.

Each agent:
  1) loads its prompt from the prompt_registry by `agent_name`
  2) takes a typed input and returns a typed output dict
  3) records inputs/outputs as a `case_event` for full audit trail

This keeps every agent fully data-driven and observable.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import CaseEvent
from app.integrations.gemini_client import GeminiClient
from app.logging_setup import get_logger
from app.registry import prompt_registry

log = get_logger(__name__)


class BaseAgent(ABC):
    name: str = "base"

    def __init__(self, db: Session, gemini: GeminiClient | None = None) -> None:
        self.db = db
        self.gemini = gemini or GeminiClient()

    def load_prompt(self) -> str:
        return prompt_registry.get_active_prompt(self.db, self.name).text

    def record_event(self, case_id: str, payload: dict[str, Any]) -> None:
        self.db.add(
            CaseEvent(
                case_id=case_id,
                event_type=f"agent.{self.name}",
                actor=self.name,
                payload=payload,
            )
        )
        self.db.commit()

    @abstractmethod
    def run(self, *, case_id: str, **kwargs: Any) -> dict[str, Any]:
        """Subclasses implement the agent body."""
