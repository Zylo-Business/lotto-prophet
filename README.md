# Lotto Prophet (Monorepo)

This monorepo contains:
- **server/**: Express + TypeScript API (port **3001**)
- **lotto-prophet/**: Next.js web app (port **3000**)
- **Lotto-Prophet-Mobile/**: Expo mobile app

## Architecture (high level)
- The API stores lottery draws in PostgreSQL.
- A flat/pivoted view is used by the lapping tools.

## Local Development

### 1) Docker PostgreSQL
See `LOCAL_SETUP_POSTGRES_DOCKER.md`.

### 2) Run the API
```bash
cd server
npm install
npm run dev
```

### 3) Run the Web app
```bash
cd lotto-prophet
npm install
npm run dev
```

Open: http://localhost:3000

## Environment Variables
- API: `server/.env`

See `server/.env.example`.

## Deploy (Backend)
- Render config: `render.yaml`

