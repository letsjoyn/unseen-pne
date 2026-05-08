#!/usr/bin/env bash
# Deploy backend + frontend to Google Cloud Run (Linux/macOS).
set -euo pipefail

PROJECT="${GOOGLE_CLOUD_PROJECT:?GOOGLE_CLOUD_PROJECT is required}"
REGION="${CLOUD_RUN_REGION:-asia-south1}"
API_NAME="unseen-pne-api"
WEB_NAME="unseen-pne-web"
API_TOKEN="${API_AUTH_TOKEN:?API_AUTH_TOKEN is required}"
GEMINI_KEY="${GOOGLE_API_KEY:-}"

echo "==> Project: $PROJECT  Region: $REGION"

echo "==> Deploying $API_NAME..."
gcloud run deploy "$API_NAME" \
  --source ./backend \
  --project "$PROJECT" \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "APP_ENV=prod,SEED_ON_START=true,API_AUTH_TOKEN=$API_TOKEN,GOOGLE_API_KEY=$GEMINI_KEY,CORS_ORIGINS=*"

API_URL=$(gcloud run services describe "$API_NAME" --project "$PROJECT" --region "$REGION" --format "value(status.url)")
echo "API: $API_URL"

echo "==> Deploying $WEB_NAME..."
gcloud run deploy "$WEB_NAME" \
  --source ./frontend \
  --project "$PROJECT" \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_API_BASE_URL=$API_URL,NEXT_PUBLIC_API_TOKEN=$API_TOKEN"

WEB_URL=$(gcloud run services describe "$WEB_NAME" --project "$PROJECT" --region "$REGION" --format "value(status.url)")
echo "Done."
echo "API: $API_URL"
echo "Web: $WEB_URL"
