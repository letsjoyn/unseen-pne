# Unseen PNE — Architecture

## Goals

1. **Action over advice.** The product moves a case from intake to outcome.
2. **Multi-agent + tool use.** Google ADK orchestrates 9 cooperating agents.
3. **No hardcoded logic.** Schemes, rules, prompts, policies live in data.
4. **Trust by design.** Citations, confidence thresholds, human approval.

---

## High-level flow

```
Intake -> Profile -> Discover Opportunities -> Decide Eligibility ->
Resolve Blockers -> Generate Packet -> Human Approve -> Route -> Follow-up -> Outcome
```

Every step emits events; the Orchestrator advances state machines and the
Insights Agent consumes the event stream for analytics.

---

## Agents

| # | Agent | Role | Key Tools |
|---|---|---|---|
| 1 | Orchestrator | Drives the workflow graph, applies confidence/approval gates | state-machine, prompt registry |
| 2 | Profiler | Form + voice + OCR -> structured profile | OCR, transcription, normalize |
| 3 | Hunter | Find candidate schemes | Scheme Registry, vector RAG, grounded search |
| 4 | Matcher | Apply eligibility rules + score | Rules Engine (JSONLogic) |
| 5 | Validator | Detect blockers + minimum path to submission | Doc gap checker, geo office lookup |
| 6 | Closer | Generate packet drafts | Templates, localizer |
| 7 | Router | Pick best primary + fallback channel | Routing Policies, partner directory |
| 8 | Watchdog | Schedule + escalate follow-ups | Cloud Tasks, notification adapters |
| 9 | Insights | Anonymized analytics + DER + missed-value | BigQuery / Postgres |

---

## Configuration tables (the "no hardcoding" boundary)

- `scheme_registry` — every scheme is a row with declarative rules + citations
- `prompt_registry` — every agent prompt is versioned text in DB
- `routing_policies` — channel weights, SLAs, fallbacks
- `followup_policies` — cadences (e.g. D+3 / D+7 / D+14) per scheme category
- `confidence_policies` — thresholds per workflow stage
- `feature_flags` — rollout by city/state/partner

Application code reads these registries; it never imports rules or
prompts as Python constants.

---

## Google Cloud topology

```
Cloud Run: api-service (FastAPI)
Cloud Run: web-frontend (Next.js)
Cloud Run jobs: scheme-ingestion, followup-worker
Cloud SQL (Postgres) + pgvector
Cloud Storage: docs, audio, generated packet PDFs
Pub/Sub: case_created, packet_approved, sla_breached, ...
Cloud Tasks: delayed follow-up jobs
Cloud Scheduler: nightly scheme refresh
Vertex AI Gemini: extraction, reasoning, drafting
Vertex AI Embeddings or pgvector: scheme document RAG
Secret Manager: API keys
Cloud Logging + Trace: observability
```

For the hackathon, you can run the same code locally against Postgres
(via docker-compose) and a Google AI API key for Gemini. Deployment to
Cloud Run is one script (`infra/deploy.ps1`).

---

## Trust & safety

- Every recommendation must include at least one citation row
  (URL + clause snippet + last_verified_at).
- Confidence thresholds gate publishing decisions; below threshold, the
  case is marked `manual_review`.
- All outbound actions (email, WhatsApp) require an explicit human
  approval call to `/api/action-packets/:caseId/approve-send`.
- PII is masked before insertion into the analytics tables.
- Every agent invocation records inputs, outputs and tools used in
  `case_events` (audit trail).
