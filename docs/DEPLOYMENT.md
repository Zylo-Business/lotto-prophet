# Deployment

## Backend (Render)

This repo uses an Express + TypeScript API in `server/`.

### Render configuration
- `render.yaml` at repo root is configured to deploy the backend only.

### Required environment variables
- `DATABASE_URL` — Neon PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret

### SSL note (Neon)
Use the SSL parameters Neon provides.
The included `server/.env.example` uses `sslmode=require`.

## Frontend (Next.js)
Not deployed in Phase 3.
- Build/deploy is expected to be done separately (e.g. Vercel or Render web service).
- Ensure `NEXT_PUBLIC_API_URL` points to the deployed backend URL.

## Mobile (Expo)
Not deployed in Phase 3.
- Use Expo tooling (EAS Build recommended for production deployments).

