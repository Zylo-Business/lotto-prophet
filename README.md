
# Lotto Prophet

A full-stack lottery analysis platform consisting of a Node.js/Express API, a Next.js web dashboard, and an Expo React Native mobile app.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Running Locally](#running-locally)
5. [Database](#database)
6. [Seeding Draw Data](#seeding-draw-data)
7. [Creating an Admin Account](#creating-an-admin-account)
8. [Admin Dashboard](#admin-dashboard)
9. [Architecture Overview](#architecture-overview)

---

## Project Structure

```
lotto-prophet-mysql/
├── server/                   # Express 5 API (TypeScript, ESM)
│   ├── config/               # JWT, token config
│   ├── db/                   # PostgreSQL pool, initDb, schema types
│   ├── middlewares/          # authenticate, authenticateAdmin
│   ├── models/               # Legacy SQL schemas (reference only)
│   ├── routes/               # auth, draws, admin, university, community, tools, ai-predict
│   ├── utils/                # seed-csv, push, create-admin, sync-google-drive, schedule-sync
│   └── index.ts              # Entry point
│
├── lotto-prophet/            # Next.js 16 web app (App Router, Tailwind v4)
│   └── src/
│       ├── app/              # Pages (dashboard, draws, admin/*, university, tools, ...)
│       ├── components/       # Sidebar, navbar, UI primitives
│       └── lib/              # auth.ts, draws.ts, admin.ts API clients
│
├── Lotto-Prophet-Mobile/     # Expo SDK 54 / React Native mobile app
│   └── app/                  # Screens (login, dashboard, draws, lapping-2/3, university, ...)
│
└── lotto-prophet-videos/     # Remotion video rendering (marketing)
```

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| pnpm | 9+ |
| PostgreSQL | Neon (cloud) — connection string required |

---

## Environment Setup

### Server (`server/.env`)

```env
PORT=3001
JWT_SECRET=your-secret-here
NODE_ENV=development

DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Google Drive folder IDs for auto-sync (optional)
GOOGLE_DRIVE_FOLDER_ID_NLA=
GOOGLE_DRIVE_FOLDER_ID_NLA_RUSH=
GOOGLE_DRIVE_FOLDER_ID_ALPHA=
GOOGLE_DRIVE_FOLDER_ID_ALPHA_ONE=
GOOGLE_DRIVE_FOLDER_ID_ALPHA_EXPRESS=
```

### Web App (`lotto-prophet/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Running Locally

```bash
# 1. Install server dependencies
cd server && pnpm install

# 2. Start API server (auto-runs initDb on startup)
pnpm dev          # http://localhost:3001

# 3. Install web app dependencies
cd ../lotto-prophet && pnpm install

# 4. Start web app
pnpm dev          # http://localhost:3000

# 5. (Optional) Start mobile app
cd ../Lotto-Prophet-Mobile && pnpm install && npx expo start
```

The server runs `initDb()` on every startup — it creates all tables with `CREATE TABLE IF NOT EXISTS` and runs any pending `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations automatically. No separate migration tool needed.

---

## Database

The project uses **PostgreSQL on Neon** (serverless). The database is initialized automatically when the server starts.

### Key tables

| Table | Purpose |
|---|---|
| `users` | Registered accounts. Has `role` column: `'user'` (default) or `'admin'` |
| `days` | Normalized calendar dates for draws |
| `draws` | Draw events by source (`alpha`, `lucky`) |
| `number_sets` | N (draw) and M (machine) number groups per draw |
| `numbers` | Individual values per position (1–5) |
| `courses` | University courses |
| `lessons` | Lessons belonging to a course |
| `user_progress` | Lesson completion records per user |
| `community_groups` | Community groups (public or private) |
| `community_group_members` | Group membership with roles |
| `community_group_posts` | Posts inside groups |
| `community_post_comments` | Comments on posts |
| `push_tokens` | Expo push tokens for notification delivery |
| `predictions` | User prediction records |

### View: `v_draws_flat`

Pivots the normalized draw data into a single flat row per draw for efficient querying:

```
event_number | date | source | N1 N2 N3 N4 N5 | n_sum | M1 M2 M3 M4 M5 | m_sum
```

---

## Seeding Draw Data

CSV files live in `server/db/`. The seeder handles both Alpha Lotto and Lucky Tuesday formats.

```bash
cd server

pnpm run seed:alpha        # Seed Alpha Lotto draws
pnpm run seed:lucky        # Seed Lucky Tuesday draws
pnpm run seed:all          # Seed both (clears alpha first)
pnpm run seed:clear        # Clear all draw data
```

---

## Creating an Admin Account

The admin dashboard at `/admin` requires a user with `role = 'admin'`. Regular sign-up always creates a `role = 'user'` account. Use the CLI script to create or promote an admin:

```bash
cd server

# Promote an existing user account to admin
npm run admin:create -- your@email.com

# Create a brand-new admin account
npm run admin:create -- your@email.com yourpassword
```

**What happens:**
- If the email already exists → the user's `role` is updated to `'admin'`
- If the email does not exist → a new account is created with `role = 'admin'`

After running this, sign in at `/signin` with the admin account. The Admin Dashboard link appears in the sidebar, and the `/admin` route becomes accessible.

**Security model:**
- JWT tokens include the `role` field
- The frontend admin layout reads the stored user's role and redirects non-admins to `/dashboard`
- All `/api/admin/*` endpoints use the `authenticateAdmin` middleware — requests from non-admin tokens receive `403 Forbidden`

---

## Admin Dashboard

Accessible at `/admin` (admin role required). Tabs:

| Tab | Features |
|---|---|
| **Overview** | Platform stats (users, draws, courses, lessons, groups, posts, push tokens), draws-by-source breakdown, add-new-draw modal |
| **Draws** | Paginated table of all draws with source filter; delete draws |
| **Users** | Paginated user list with search; delete users |
| **Community** | Groups and Posts tabs; view counts, delete groups/posts |
| **University** | Two-panel: courses list (add/edit/delete) + lessons panel for selected course (add/edit/delete) |
| **Notifications** | Broadcast push notification to all devices; paginated push token registry with revoke action |

---

## Architecture Overview

| Component | Stack | Port |
|---|---|---|
| **API** | Express 5, TypeScript (ESM), PostgreSQL (Neon) | `3001` |
| **Web** | Next.js 16 App Router, Tailwind CSS v4, shadcn/ui | `3000` |
| **Mobile** | Expo SDK 54, React Native, Expo Router | Expo Dev |
| **Database** | PostgreSQL — Neon serverless | Cloud |
| **Push** | Expo Push Notification Service | — |

### Auth flow

1. `POST /api/auth/login` → returns `{ token, user }` where `user.role` is either `'user'` or `'admin'`
2. Token is a JWT signed with `JWT_SECRET`, payload: `{ id, email, role }`
3. Web app stores both `token` and `user` in `localStorage`
4. Protected pages read `localStorage` to gate access; admin pages additionally check `role === 'admin'`
5. API requests send `Authorization: Bearer <token>`
6. `authenticate` middleware verifies the token; `authenticateAdmin` additionally rejects non-admin tokens with `403`

### Google Drive sync

The server syncs new draw CSVs from configured Google Drive folders automatically:
- On startup: `syncGoogleDrive()` runs once
- Scheduled: `setupSyncCron()` runs on a recurring interval

Folder IDs are configured in `server/.env`.
=======
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

