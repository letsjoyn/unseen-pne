"""Run the ADK SequentialAgent for a given case.

We use ADK's InMemorySessionService for the hackathon and let the
orchestrator drive the workflow. If `GOOGLE_API_KEY` (or Vertex creds)
is missing, the LLM calls cannot run -- in that case we fall back to
the deterministic Python orchestrator so the demo still works.
"""

from __future__ import annotations

import asyncio
from typing import Any

from sqlalchemy.orm import Session

from app.adk.agents import build_agents
from app.adk.session_ctx import ToolContext, use_context
from app.config import get_settings
from app.db import models
from app.logging_setup import get_logger

log = get_logger(__name__)

_APP_NAME = "unseen-pne"


async def _run_async(db: Session, case_id: str) -> dict[str, Any]:
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types as genai_types

    orchestrator = build_agents(db)
    session_service = InMemorySessionService()
    user_id = "operator"
    session = await session_service.create_session(
        app_name=_APP_NAME, user_id=user_id, session_id=case_id
    )

    runner = Runner(
        app_name=_APP_NAME,
        agent=orchestrator,
        session_service=session_service,
    )

    db.add(
        models.CaseEvent(
            case_id=case_id,
            event_type="adk.run.start",
            actor="orchestrator",
            payload={"agents": [a.name for a in orchestrator.sub_agents]},
        )
    )
    db.commit()

    user_msg = genai_types.Content(
        role="user",
        parts=[
            genai_types.Part(
                text=(
                    f"Run the full Unseen PNE pipeline for case {case_id}. "
                    "Each agent should call its tools to read/write state. "
                    "The Profiler runs first, then Hunter, Matcher, Validator, "
                    "Closer, Router, Watchdog. If the household opportunity queue "
                    "contains dependents, the Hunter should plan those support "
                    "swarms in parallel before the case continues."
                )
            )
        ],
    )

    last_event = None
    with use_context(ToolContext(db=db, case_id=case_id)):
        async for event in runner.run_async(
            user_id=user_id, session_id=session.id, new_message=user_msg
        ):
            last_event = event
            if getattr(event, "content", None) and getattr(event.content, "parts", None):
                for part in event.content.parts:
                    if getattr(part, "function_call", None):
                        log.info(
                            "adk_tool_call",
                            agent=event.author,
                            tool=part.function_call.name,
                        )

    db.add(
        models.CaseEvent(
            case_id=case_id,
            event_type="adk.run.end",
            actor="orchestrator",
            payload={"final_author": getattr(last_event, "author", None)},
        )
    )
    db.commit()
    return {"status": "completed", "final_author": getattr(last_event, "author", None)}


def run_pipeline(db: Session, case_id: str) -> dict[str, Any]:
    settings = get_settings()
    has_credentials = bool(settings.google_api_key) or settings.google_genai_use_vertexai
    if not has_credentials:
        from app.agents.orchestrator import Orchestrator

        log.info("adk_no_credentials_using_python_fallback")
        result = Orchestrator(db).run_full_pipeline(case_id=case_id)
        return {"status": "completed_via_fallback", **result}

    try:
        return asyncio.run(_run_async(db, case_id))
    except Exception as exc:  # noqa: BLE001
        log.warning("adk_run_failed_falling_back", error=str(exc))
        from app.agents.orchestrator import Orchestrator

        result = Orchestrator(db).run_full_pipeline(case_id=case_id)
        return {"status": "completed_via_fallback", "error": str(exc), **result}
