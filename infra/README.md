# Infra

## Local

```powershell
docker compose up --build
```

## Cloud Run (PowerShell)

```powershell
$Env:GOOGLE_CLOUD_PROJECT = "your-project"
$Env:GOOGLE_API_KEY       = "your-gemini-key"
$Env:API_AUTH_TOKEN       = "a-strong-token"
./infra/deploy.ps1
```

## Cloud Run (Linux/macOS)

```bash
export GOOGLE_CLOUD_PROJECT=your-project
export GOOGLE_API_KEY=your-gemini-key
export API_AUTH_TOKEN=a-strong-token
./infra/deploy.sh
```

The script:
1. Builds + deploys the backend container from `./backend`
2. Reads its public URL
3. Builds + deploys the frontend, injecting that URL via `NEXT_PUBLIC_API_BASE_URL`

For Cloud SQL, override `DATABASE_URL` to a Postgres URL and add a Cloud
SQL connector via `--add-cloudsql-instances` (recommended for production).

## Notes

- The backend uses SQLite locally for zero-config dev. Switch to Postgres
  by setting `DATABASE_URL`.
- All schemes/prompts/policies seed from JSON on first boot. To rotate
  prompts or scheme rules in prod, POST to `/api/admin/...` — no redeploy
  needed.
