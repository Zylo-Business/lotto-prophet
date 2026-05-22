# Local setup: PostgreSQL + Lotto Prophet (Docker)

## 1) Start PostgreSQL with Docker
From the repo root (`c:/Users/HP/Documents/lotto-prophet`), run:

```bash
docker run --name lotto-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=lotto -p 5432:5432 -d postgres:16
```

Verify:

```bash
docker ps
```

## 2) Create `server/.env`
Create a file:

- `server/.env`

with:

```env
PORT=3001
DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/lotto
JWT_SECRET=tony4prophet
```

> Note: `host.docker.internal` works on Docker Desktop for Windows to reach your host.

## 3) Install & run the server
```bash
cd server
npm install
npm run dev
```

Server should start on:
- http://0.0.0.0:3001 (API)

## 4) Run the web app
```bash
cd ..\lotto-prophet
npm install
npm run dev
```

Then open:
- http://localhost:3000

## 5) Seed data (optional)
If you want to load sample draws:

```bash
cd ..\server
npm run seed:all
```

## Common issues
### “ECONNREFUSED” / can’t connect to DB
- Ensure the container is running: `docker ps`
- Ensure port mapping is correct (5432:5432)
- Re-check `server/.env` `DATABASE_URL`

### Google Drive sync errors
`server/index.ts` runs Drive sync on startup only if:
- `server/credentials.json` exists
- the required `GOOGLE_DRIVE_FOLDER_ID_*` env vars are set

If you don’t need Drive sync, you can ignore warnings.

