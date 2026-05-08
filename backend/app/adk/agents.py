"""ADK LlmAgent definitions for the Unseen PNE multi-agent system.

The agents are composed via `SequentialAgent` into the orchestrator.
Each agent's instruction is pulled from the prompt_registry, so prompt
text is editable at runtime via /api/admin/prompts.
"""

from __future__ import annotations

from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools import FunctionTool
from sqlalchemy.orm import Session

from app.adk import tools as t
from app.config import get_settings
from app.registry import prompt_registry


# ----- Prompt loading -----


def _instruction(db: Session, agent_name: str, fallback: str) -> str:
    """Load the registry prompt for `agent_name`; fall back to `fallback`."""

    try:
        prompt = prompt_registry.get_active_prompt(db, agent_name)
        return prompt.text
    except prompt_registry.PromptNotFound:
        return fallback


_PROFILER_FALLBACK = (
    "You are the Profiler. Call get_intake() to fetch the raw intake. "
    "Convert it to a structured profile (keys: demographics, economic, "
    "household, documents, location, vulnerability_tags). Then call "
    "save_profile(profile_json=<JSON string of the profile>, confidence, "
    "missing_fields). Profile_json MUST be a JSON-encoded string. "
    "Do not invent facts; missing fields go into missing_fields. "
    "Vulnerability tags must be evidence-supported."
)

_HUNTER_FALLBACK = (
    "You are the Hunter. Call list_candidate_schemes(state=<beneficiary state>) "
    "to fetch all schemes for the beneficiary's state from the saved profile. "
    "Then call get_household_opportunity_queue(). If the queue is non-empty, "
    "call plan_household_swarm() so dependent-member support swarms are planned "
    "in parallel. Then briefly summarize how many candidates were found. "
    "Do not invent schemes."
)

_MATCHER_FALLBACK = (
    "You are the Matcher. For EACH candidate scheme returned by list_candidate_schemes:\n"
    "  1. Call evaluate_eligibility(scheme_id) -- ONE scheme at a time, never concat.\n"
    "  2. Use the engine's decision/score/confidence/missing_inputs verbatim.\n"
    "  3. Call save_match_decision(scheme_id, decision, score, confidence, urgency, "
    "reason_codes) where urgency='high' for eligible, 'medium' for probable, 'low' otherwise.\n"
    "After saving every match, respond with ONLY the scheme_id of the single best "
    "(eligible, highest score) match. Never combine multiple ids."
)

_VALIDATOR_FALLBACK = (
    "You are the Validator. Call list_matches() and identify the SINGLE top "
    "eligible scheme_id. Call evaluate_eligibility(scheme_id) for that ONE scheme; "
    "use its available_documents and required_documents fields to find missing docs. "
    "Build a blockers list (one entry per missing doc, plus any KYC/bank issues): "
    "each entry has keys type, description, required_items, next_steps, severity. "
    "Then call save_blockers(scheme_id=<the one scheme id>, blockers_json=<JSON.stringify "
    "of the list>, minimum_path=<ordered list of steps>). NEVER pass multiple scheme_ids "
    "concatenated; pass exactly one."
)

_CLOSER_FALLBACK = (
    "You are the Closer. Call list_matches(); pick the SINGLE top eligible scheme. "
    "You MUST call save_action_packet(scheme_id, cover_letter, email_subject, "
    "email_body, whatsapp_summary, checklist) exactly once. Do not skip it. Drafts "
    "must be respectful and factual; end every draft with the literal marker "
    "DRAFT_FOR_HUMAN_APPROVAL. checklist is a list of required document strings. "
    "After save_action_packet returns, briefly confirm 'packet saved'."
)

_ROUTER_FALLBACK = (
    "You are the Router. Call list_matches() to identify the SINGLE top scheme. "
    "Call score_routes(scheme_id) for that scheme. Then call save_route_plan("
    "primary_json, fallback_json, scores_json) where each *_json arg is a "
    "JSON.stringify of the corresponding object/value returned by score_routes. "
    "If there is no fallback, pass fallback_json='null'."
)

_WATCHDOG_FALLBACK = (
    "You are the Watchdog. Call list_matches() to find the top scheme_id. Then "
    "call schedule_followups(scheme_id=<that id>) with cadence_json='' to use the "
    "configured policy. Do not invent custom cadences."
)


def build_agents(db: Session) -> SequentialAgent:
    settings = get_settings()
    model = settings.gemini_model_reasoning

    profiler = LlmAgent(
        name="profiler",
        model=model,
        instruction=_instruction(db, "profiler", _PROFILER_FALLBACK),
        tools=[FunctionTool(t.get_intake), FunctionTool(t.save_profile), FunctionTool(t.record_event)],
        output_key="profiler_result",
    )

    hunter = LlmAgent(
        name="hunter",
        model=model,
        instruction=_instruction(db, "hunter", _HUNTER_FALLBACK),
        tools=[
            FunctionTool(t.list_candidate_schemes),
            FunctionTool(t.get_household_opportunity_queue),
            FunctionTool(t.plan_household_swarm),
            FunctionTool(t.record_event),
        ],
        output_key="hunter_result",
    )

    matcher = LlmAgent(
        name="matcher",
        model=model,
        instruction=_instruction(db, "matcher", _MATCHER_FALLBACK),
        tools=[
            FunctionTool(t.list_candidate_schemes),
            FunctionTool(t.evaluate_eligibility),
            FunctionTool(t.save_match_decision),
            FunctionTool(t.list_matches),
            FunctionTool(t.record_event),
        ],
        output_key="matcher_result",
    )

    validator = LlmAgent(
        name="validator",
        model=model,
        instruction=_instruction(db, "validator", _VALIDATOR_FALLBACK),
        tools=[
            FunctionTool(t.list_matches),
            FunctionTool(t.evaluate_eligibility),
            FunctionTool(t.save_blockers),
            FunctionTool(t.record_event),
        ],
        output_key="validator_result",
    )

    closer = LlmAgent(
        name="closer",
        model=settings.gemini_model_drafting,
        instruction=_instruction(db, "closer", _CLOSER_FALLBACK),
        tools=[
            FunctionTool(t.list_matches),
            FunctionTool(t.save_action_packet),
            FunctionTool(t.record_event),
        ],
        output_key="closer_result",
    )

    router = LlmAgent(
        name="router",
        model=model,
        instruction=_instruction(db, "router", _ROUTER_FALLBACK),
        tools=[
            FunctionTool(t.score_routes),
            FunctionTool(t.save_route_plan),
            FunctionTool(t.list_matches),
            FunctionTool(t.record_event),
        ],
        output_key="router_result",
    )

    watchdog = LlmAgent(
        name="watchdog",
        model=model,
        instruction=_instruction(db, "watchdog", _WATCHDOG_FALLBACK),
        tools=[
            FunctionTool(t.schedule_followups),
            FunctionTool(t.list_matches),
            FunctionTool(t.record_event),
        ],
        output_key="watchdog_result",
    )

    return SequentialAgent(
        name="unseen_orchestrator",
        sub_agents=[profiler, hunter, matcher, validator, closer, router, watchdog],
    )
