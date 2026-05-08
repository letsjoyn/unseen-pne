# Unseen PNE

> *Find the forgotten. Prove the need. Route the help. Close the loop.*

A proactive, multi-agent community operations platform that converts one resident intake into a verified support case, auto-generates application packets, routes to the best responder, and follows up until resolution.

---

## Repo Layout

```
unseen-pne/
  backend/         FastAPI + Google ADK multi-agent system (Python 3.11)
  frontend/        Next.js 14 volunteer dashboard (TypeScript + Tailwind)
  infra/           Cloud Run deployment configs + helper scripts
  docker-compose.yml
```

The system is **fully configuration-driven**. Schemes, eligibility rules,
agent prompts, routing policies and follow-up cadences are all loaded from
JSON config (and, in production, from the database). Nothing is hardcoded
in application code.

---

## Quick start (local dev)

Prerequisites: Node 20+, Python 3.11+ (the `py` launcher on Windows), and
optionally a Google AI API key for Gemini (the system runs end-to-end
without one using deterministic stubs).

### Option A — run without Docker (recommended on Windows)

```powershell
# Backend
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install --upgrade pip
py -m pip install -r requirements.txt
copy .env.example .env
py -m uvicorn app.main:app --reload --port 8080
```

Open a second PowerShell window:

```powershell
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

### Option B — Docker Compose (Postgres + API + Web)

```powershell
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
docker compose up --build
```

Frontend: http://localhost:3000  
Backend:  http://localhost:8080  
API docs: http://localhost:8080/docs

The backend automatically seeds the database on first run from
`backend/config/*.seed.json`. Edit those files to add schemes, change
prompts, or tune policies — no code changes needed.

Optional live integrations:

- Set `GOOGLE_MAPS_API_KEY` to enable live Places lookup for print routing.
- Run `python -m app.jobs.eligibility_pulse_worker` to execute the nightly living-eligibility re-match pass locally.

---

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system
design, agent responsibilities, and Google Cloud topology.

For demo prep and QA:

- [`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md) - best-case judge flow and talk track
- [`docs/QA_CHECKLIST.md`](docs/QA_CHECKLIST.md) - regression checklist before demos/merges
- [`backend/config/demo_cases.seed.json`](backend/config/demo_cases.seed.json) - reusable synthetic case pack

```
Volunteer
   |
   v
[ Frontend (Next.js) ]
   |  REST/JSON
   v
[ Backend API (FastAPI) ]
   |
   v
[ Orchestrator Agent (ADK) ]
   |
   +--> Profiler Agent
   +--> Hunter Agent      ---> Scheme Registry + Vector RAG
   +--> Matcher Agent     ---> Rules Engine (JSONLogic)
   +--> Validator Agent   ---> Blocker Detector
   +--> Closer Agent      ---> Packet Templates
   +--> Router Agent      ---> Routing Policies
   +--> Watchdog Agent    ---> Follow-up Scheduler
   +--> Insights Agent    ---> Anonymized Analytics

State:  Postgres (Cloud SQL)  |  Files: Cloud Storage  |  Events: Pub/Sub
LLM:    Vertex AI Gemini      |  Search: pgvector / Vertex AI Vector Search
```

---

## Deployment to Google Cloud

```powershell
cd infra
./deploy.ps1
```

This builds Docker images, pushes to Artifact Registry, deploys backend
and frontend to Cloud Run, and wires the frontend to the backend URL.

---

## Why this wins

- **AI that takes action** (not chat) — generates packets, routes work, schedules follow-ups
- **Multi-agent + tool use + real data** — Google ADK orchestrating 9 agents over a real rules engine and RAG
- **End-to-end workflow** — intake → outcome
- **Zero hardcoding** — every scheme, rule, prompt and policy is data
- **Trust by design** — citations, confidence thresholds, human approval gates
