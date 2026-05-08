# Unseen PNE — Backend

FastAPI service hosting the multi-agent system (Profiler, Hunter, Matcher,
Validator, Closer, Router, Watchdog, Insights) plus an Orchestrator that
drives the case lifecycle.

## Local dev

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install --upgrade pip
py -m pip install -r requirements.txt
copy .env.example .env
# edit .env and set GOOGLE_API_KEY for live Gemini calls (optional - stubs used otherwise)

py -m uvicorn app.main:app --reload --port 8080
```

API docs: http://localhost:8080/docs

## "No hardcoding" rules

- Schemes live in `config/schemes.seed.json` and the `schemes` table.
- Agent prompts live in `config/prompts.seed.json` and the `prompts` table.
- Routing / follow-up / confidence weights live in `config/*_policies.seed.json` and the `policies` table.
- All of the above can be edited at runtime through `/api/admin/*` endpoints.

## Smoke test (PowerShell)

```powershell
$T = "change-me-in-prod"
$body = '{
  "operator_id": "vol_001",
  "consent": true,
  "beneficiary": {
    "name": "Anita Devi", "age": 47, "gender": "female",
    "is_widow": true, "monthly_income": 7000, "occupation": "domestic worker",
    "household_size": 4, "dependents": 2,
    "documents_available": ["aadhaar","ration_card"],
    "bank_linked": false, "smartphone_access": false,
    "literacy_level": "low",
    "location": {"state": "Karnataka", "district": "Bengaluru Urban", "pincode": "560001"}
  }
}'

$case = Invoke-RestMethod -Uri http://localhost:8080/api/cases -Method POST -Headers @{Authorization="Bearer $T";"Content-Type"="application/json"} -Body $body
$caseId = $case.case_id

Invoke-RestMethod -Uri "http://localhost:8080/api/cases/$caseId/run" -Method POST -Headers @{Authorization="Bearer $T"}
Invoke-RestMethod -Uri "http://localhost:8080/api/cases/$caseId" -Headers @{Authorization="Bearer $T"} | ConvertTo-Json -Depth 6
```

## Deploy to Cloud Run

```powershell
gcloud run deploy unseen-pne-api `
  --source . `
  --region asia-south1 `
  --allow-unauthenticated `
  --set-env-vars "APP_ENV=prod,SEED_ON_START=true,API_AUTH_TOKEN=$Env:API_AUTH_TOKEN,GOOGLE_API_KEY=$Env:GOOGLE_API_KEY,DATABASE_URL=$Env:DATABASE_URL"
```
