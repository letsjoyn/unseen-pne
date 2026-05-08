"""Per-invocation context for ADK tools.

ADK tools are plain Python callables that the LLM may invoke. They need
access to the active SQLAlchemy Session and the current case_id without
those being part of the function signature (the LLM should never have to
pass them). We thread them through a ContextVar that the FastAPI endpoint
sets before running the orchestrator.
"""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass

from sqlalchemy.orm import Session


@dataclass
class ToolContext:
    db: Session
    case_id: str


_current: ContextVar[ToolContext | None] = ContextVar("unseen_tool_ctx", default=None)


@contextmanager
def use_context(ctx: ToolContext):
    token = _current.set(ctx)
    try:
        yield
    finally:
        _current.reset(token)


def get_context() -> ToolContext:
    ctx = _current.get()
    if ctx is None:
        raise RuntimeError("No ToolContext set; wrap the call in `use_context(...)`")
    return ctx
