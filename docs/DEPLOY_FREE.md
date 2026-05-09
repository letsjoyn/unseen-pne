# Free Deploy (Fastest Path)

This repo deploys fastest with:

- Frontend: Vercel (Hobby)
- Backend: Render Web Service (Free)
- Database: Neon Postgres (Free)

## 1) Backend on Render

1. Push this repo to GitHub.
2. In Render, create a new Blueprint service from this repo (it will use `render.yaml`).
3. Set the required env vars in Render:
   - `DATABASE_URL` (Neon connection string, `postgresql+psycopg://...`)
   - `API_AUTH_TOKEN` (long random secret)
   - `JWT_SECRET` (long random secret)
   - `CORS_ORIGINS` (your Vercel URL, for example `https://unseen-pne.vercel.app`)
   - `GOOGLE_API_KEY` (optional)
4. Deploy and copy backend URL (example: `https://unseen-pne-api.onrender.com`).
5. Verify:
   - `GET <backend-url>/health` returns `{"status":"ok",...}`.

## 2) Frontend on Vercel

1. Import GitHub repo in Vercel.
2. Set Root Directory to `frontend`.
3. Add environment variables:
   - `NEXT_PUBLIC_API_BASE_URL=<your-render-backend-url>`
   - `NEXT_PUBLIC_API_TOKEN=<same API_AUTH_TOKEN as backend>`
4. Deploy.

## 3) Final CORS update

After Vercel gives your final domain, set backend `CORS_ORIGINS` to that exact URL and redeploy Render.

## Notes

- Render free services sleep when idle; first request can be slow.
- Keep `SEED_ON_START=true` for demo data on fresh deploys.
