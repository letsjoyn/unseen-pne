# Deploy backend + frontend to Google Cloud Run.
# Usage:
#   $Env:GOOGLE_CLOUD_PROJECT = "your-project"
#   $Env:GOOGLE_API_KEY       = "..."
#   $Env:API_AUTH_TOKEN       = "your-strong-token"
#   ./infra/deploy.ps1

$ErrorActionPreference = "Stop"

$Project   = $Env:GOOGLE_CLOUD_PROJECT
$Region    = if ($Env:CLOUD_RUN_REGION) { $Env:CLOUD_RUN_REGION } else { "asia-south1" }
$ApiName   = "unseen-pne-api"
$WebName   = "unseen-pne-web"
$ApiToken  = $Env:API_AUTH_TOKEN
$GeminiKey = $Env:GOOGLE_API_KEY

if (-not $Project)   { throw "GOOGLE_CLOUD_PROJECT is not set" }
if (-not $ApiToken)  { throw "API_AUTH_TOKEN is not set"      }

Write-Host "==> Project: $Project   Region: $Region" -ForegroundColor Cyan

# 1) Backend
Write-Host "==> Deploying $ApiName..." -ForegroundColor Cyan
gcloud run deploy $ApiName `
  --source ./backend `
  --project $Project `
  --region $Region `
  --allow-unauthenticated `
  --set-env-vars "APP_ENV=prod,SEED_ON_START=true,API_AUTH_TOKEN=$ApiToken,GOOGLE_API_KEY=$GeminiKey,CORS_ORIGINS=*"

$apiUrl = (gcloud run services describe $ApiName --project $Project --region $Region --format "value(status.url)").Trim()
Write-Host "API deployed at: $apiUrl" -ForegroundColor Green

# 2) Frontend - inject backend URL
Write-Host "==> Deploying $WebName..." -ForegroundColor Cyan
gcloud run deploy $WebName `
  --source ./frontend `
  --project $Project `
  --region $Region `
  --allow-unauthenticated `
  --set-env-vars "NEXT_PUBLIC_API_BASE_URL=$apiUrl,NEXT_PUBLIC_API_TOKEN=$ApiToken"

$webUrl = (gcloud run services describe $WebName --project $Project --region $Region --format "value(status.url)").Trim()
Write-Host ""
Write-Host "Done."     -ForegroundColor Green
Write-Host "API: $apiUrl"
Write-Host "Web: $webUrl"
