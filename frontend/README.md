# Unseen PNE — Frontend

Next.js 14 App Router + TypeScript + Tailwind. Pure client of the backend
API; no business logic lives here.

## Local dev

```powershell
cd frontend
npm install
copy .env.example .env.local
# Set NEXT_PUBLIC_API_BASE_URL to your backend URL (default http://localhost:8080)
npm run dev
```

Open http://localhost:3000.

## Pages

- `/` — landing
- `/intake` — new case intake (creates the case + auto-runs orchestrator)
- `/cases` — list of cases
- `/cases/[caseId]` — case detail with profile, matches, blockers, packet, routing, follow-ups, and audit trail
- `/insights` — anonymized aggregate metrics (DER, missed value, follow-ups, etc.)

## Deploy to Cloud Run

```powershell
gcloud run deploy unseen-pne-web `
  --source . `
  --region asia-south1 `
  --allow-unauthenticated `
  --set-env-vars "NEXT_PUBLIC_API_BASE_URL=$Env:API_URL,NEXT_PUBLIC_API_TOKEN=$Env:API_TOKEN"
```
