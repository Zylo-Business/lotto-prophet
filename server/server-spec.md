# Lotto Prophet — Server & Application Specification

> Last updated: 2026-05-20

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Server Entry & Middleware](#server-entry--middleware)
3. [Database](#database)
4. [Authentication & Roles](#authentication--roles)
5. [API Endpoints](#api-endpoints)
   - [Auth](#auth----apïauth)
   - [Draws](#draws----apidraws)
   - [Tools (Lapping)](#tools----apitools)
   - [University](#university----apiuniversity)
   - [Community](#community----apicommunity)
   - [AI Predict](#ai-predict----apiai-predict)
   - [Admin](#admin----apiadmin)
6. [Admin Dashboard](#admin-dashboard)
7. [Admin Account Management](#admin-account-management)
8. [Push Notifications](#push-notifications)
9. [Data Seeding](#data-seeding)
10. [Google Drive Sync](#google-drive-sync)
11. [Web Application (Next.js)](#web-application-nextjs)
12. [Mobile Application (Expo)](#mobile-application-expo)
13. [Configuration](#configuration)
14. [Known Gaps / TODOs](#known-gaps--todos)

---

## Architecture Overview

| Component | Stack | Port |
|---|---|---|
| **API** | Express 5, TypeScript (ESM), PostgreSQL (Neon) | `3001` |
| **Web** | Next.js 16 App Router, Tailwind CSS v4, shadcn/ui | `3000` |
| **Mobile** | Expo SDK 54, React Native, Expo Router | Expo Dev |
| **Database** | PostgreSQL — Neon serverless cloud | Cloud |
| **Push** | Expo Push Notification Service | — |

---

## Server Entry & Middleware

**Entry:** `server/index.ts`

**Middleware stack:** CORS (open), Morgan (dev logging), `express.json()`

**Route registration:**

| Prefix | Module |
|---|---|
| `/api/auth` | `routes/auth.ts` |
| `/api/draws` | `routes/draws.ts` |
| `/api/admin` | `routes/admin.ts` |
| `/api/university` | `routes/university.ts` |
| `/api/tools` | `routes/tools.ts` |
| `/api/community` | `routes/community.ts` |
| `/api/ai-predict` | `routes/ai-predict.ts` |
| `GET /` | Health-check response |

**Startup sequence:**
1. `initDb()` — runs all `CREATE TABLE IF NOT EXISTS` statements and any `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations
2. `setupSyncCron()` — registers scheduled Google Drive sync job
3. `syncGoogleDrive()` — runs an initial sync immediately
4. `app.listen(3001, '0.0.0.0')`

---

## Database

**Provider:** Neon (serverless PostgreSQL). Connection string in `DATABASE_URL` env var.

The `initDb()` function in `db/db.ts` is idempotent — safe to run on every startup.

### Tables

#### `days`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `date` | VARCHAR(10) UNIQUE | `YYYY-MM-DD` |
| `year` | INT | |
| `month` | INT | |
| `day` | INT | |
| `weekday` | INT | 0 = Sunday … 6 = Saturday |
| `weekday_name` | VARCHAR(20) | |

#### `draws`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `event_number` | INT NOT NULL | |
| `day_id` | INT FK → `days(id)` | |
| `source` | VARCHAR(50) DEFAULT `'alpha'` | `'alpha'` or `'lucky'` |
| `file_name` | VARCHAR(255) DEFAULT `''` | CSV file name used for seeding |

#### `number_sets`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `draw_id` | INT FK → `draws(id)` ON DELETE CASCADE | |
| `set_type` | VARCHAR(1) CHECK IN `('N','M')` | `N` = draw numbers, `M` = machine numbers |

#### `numbers`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `number_set_id` | INT FK → `number_sets(id)` ON DELETE CASCADE | |
| `position` | INT | 1–5 |
| `value` | INT | 1–90 |

#### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `firstname` | VARCHAR(100) | |
| `surname` | VARCHAR(100) | |
| `email` | VARCHAR(255) UNIQUE | lowercase |
| `country_code` | VARCHAR(10) | e.g. `+233` |
| `mobile_number` | VARCHAR(20) | 10 digits |
| `referral_code` | VARCHAR(50) DEFAULT NULL | optional |
| `password_hash` | VARCHAR(255) | bcrypt (12 rounds) |
| `date_of_birth` | DATE | must be 18+ at registration |
| `role` | VARCHAR(20) DEFAULT `'user'` | `'user'` or `'admin'` |
| `reset_token` | VARCHAR(255) DEFAULT NULL | SHA-256 hashed reset token |
| `reset_token_expires` | TIMESTAMP DEFAULT NULL | 1-hour expiry |
| `created_at` | TIMESTAMP DEFAULT NOW() | |
| UNIQUE | `(country_code, mobile_number)` | |

#### `predictions`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `user_id` | INT FK → `users(id)` | |
| `predicted_numbers` | TEXT | JSON string |
| `prediction_date` | DATE DEFAULT NOW() | |

#### `push_tokens`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `user_id` | INT FK → `users(id)` ON DELETE CASCADE, DEFAULT NULL | nullable (anonymous devices) |
| `token` | VARCHAR(255) UNIQUE | Expo push token |
| `platform` | VARCHAR(20) DEFAULT `'unknown'` | `android`, `ios`, etc. |
| `created_at` | TIMESTAMP DEFAULT NOW() | |

#### `courses`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `level` | INT | 1 = Beginner, 2 = Intermediate, 3 = Advanced |
| `level_name` | VARCHAR(100) | display label for level |
| `title` | VARCHAR(255) | |
| `slug` | VARCHAR(100) UNIQUE | URL-safe identifier |
| `description` | TEXT DEFAULT NULL | |
| `icon` | VARCHAR(50) DEFAULT `'📚'` | emoji |
| `sort_order` | INT DEFAULT 0 | display ordering |
| `is_published` | SMALLINT DEFAULT 0 | `1` = published |
| `created_at` | TIMESTAMP DEFAULT NOW() | |

#### `lessons`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `course_id` | INT FK → `courses(id)` ON DELETE CASCADE | |
| `title` | VARCHAR(255) | |
| `slug` | VARCHAR(100) | unique within course |
| `content` | TEXT DEFAULT NULL | Markdown |
| `sort_order` | INT DEFAULT 0 | |
| `is_published` | SMALLINT DEFAULT 0 | |
| `created_at` | TIMESTAMP DEFAULT NOW() | |
| UNIQUE | `(course_id, slug)` | |

#### `user_progress`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `user_id` | INT FK → `users(id)` ON DELETE CASCADE | |
| `lesson_id` | INT FK → `lessons(id)` ON DELETE CASCADE | |
| `completed_at` | TIMESTAMP DEFAULT NOW() | |
| UNIQUE | `(user_id, lesson_id)` | |

#### `community_groups`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `name` | VARCHAR(255) | |
| `description` | TEXT DEFAULT `''` | |
| `owner_id` | INT FK → `users(id)` ON DELETE CASCADE | |
| `is_private` | SMALLINT DEFAULT 0 | `1` = private (join code required) |
| `join_code` | VARCHAR(100) DEFAULT NULL | |
| `created_at` | TIMESTAMP DEFAULT NOW() | |

#### `community_group_members`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `group_id` | INT FK → `community_groups(id)` ON DELETE CASCADE | |
| `user_id` | INT FK → `users(id)` ON DELETE CASCADE | |
| `role` | VARCHAR(20) DEFAULT `'member'` | `'owner'`, `'moderator'`, `'member'` |
| `joined_at` | TIMESTAMP DEFAULT NOW() | |
| UNIQUE | `(group_id, user_id)` | |

#### `community_group_posts`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `group_id` | INT FK → `community_groups(id)` ON DELETE CASCADE | |
| `user_id` | INT FK → `users(id)` ON DELETE CASCADE | |
| `title` | VARCHAR(255) | |
| `body` | TEXT | |
| `post_type` | VARCHAR(20) DEFAULT `'discussion'` | `'discussion'` or `'forecast'` |
| `predicted_numbers` | VARCHAR(255) DEFAULT NULL | |
| `is_pinned` | SMALLINT DEFAULT 0 | |
| `is_locked` | SMALLINT DEFAULT 0 | |
| `created_at` | TIMESTAMP DEFAULT NOW() | |

#### `community_post_comments`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `post_id` | INT FK → `community_group_posts(id)` ON DELETE CASCADE | |
| `user_id` | INT FK → `users(id)` ON DELETE CASCADE | |
| `body` | TEXT | |
| `created_at` | TIMESTAMP DEFAULT NOW() | |

#### `community_group_bans`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `group_id` | INT FK → `community_groups(id)` ON DELETE CASCADE | |
| `user_id` | INT FK → `users(id)` ON DELETE CASCADE | |
| `banned_by` | INT FK → `users(id)` ON DELETE SET NULL | |
| `reason` | VARCHAR(255) DEFAULT NULL | |
| `created_at` | TIMESTAMP DEFAULT NOW() | |

#### `community_post_likes`
| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL PK | |
| `post_id` | INT FK → `community_group_posts(id)` ON DELETE CASCADE | |
| `user_id` | INT FK → `users(id)` ON DELETE CASCADE | |
| `created_at` | TIMESTAMP DEFAULT NOW() | |
| UNIQUE | `(post_id, user_id)` | |

### View: `v_draws_flat`

Pivots normalized draw data into a single flat row per draw. Dropped and recreated on every `initDb()` to pick up schema changes.

```
event_number | date | source | file_name | N1 N2 N3 N4 N5 | n_sum | M1 M2 M3 M4 M5 | m_sum
```

---

## Authentication & Roles

### JWT

- **Secret:** `JWT_SECRET` env var
- **Payload:** `{ id, email, role }`
- **Expiry:** 7 days (configurable in `config/index.ts`)
- Both `login` and `register` return a token with the user's current `role`

### Roles

| Role | Access |
|---|---|
| `'user'` | Default. Access to all public and authenticated user routes |
| `'admin'` | Full access including all `/api/admin/*` endpoints and the admin dashboard UI |

### Middleware

| Middleware | File | Behaviour |
|---|---|---|
| `authenticate` | `middlewares/auth.ts` | Verifies Bearer token, attaches `req.user = { id, email, role }`. Returns `401` if missing or invalid. |
| `authenticateAdmin` | `middlewares/auth.ts` | Same as `authenticate` but additionally returns `403` if `role !== 'admin'`. |

### Password handling

- Hashed with bcrypt (12 rounds)
- Reset tokens: `crypto.randomBytes(32)` → stored as SHA-256 hash, 1-hour expiry
- Reset endpoint clears the token and hash after successful use

### Client-side storage

| Client | Token | User |
|---|---|---|
| Web (Next.js) | `localStorage.getItem("token")` | `localStorage.getItem("user")` (JSON) |
| Mobile (Expo) | `expo-secure-store` | `expo-secure-store` |

---

## API Endpoints

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | No | Create user account. Body: `{ firstname, surname, email, country_code, mobile_number, password, date_of_birth, referral_code? }`. Validates email format, 10-digit mobile, 18+ age, 8-char min password. Returns `{ message, token, user }`. New accounts always get `role = 'user'`. |
| `POST` | `/login` | No | Sign in. Body: `{ identifier, password }`. Identifier is email or phone number. Returns `{ message, token, user }`. Token payload includes `role`. |
| `POST` | `/forgot-password` | No | Request reset. Body: `{ email }`. Returns `{ message, reset_token }` (token also returned in response until email service is integrated). |
| `POST` | `/reset-password` | No | Reset password. Body: `{ token, new_password }`. |

### Draws — `/api/draws`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/sources` | No | Returns distinct sources with draw counts. Response: `[{ source, draw_count }]`. |
| `GET` | `/:source` | No | Paginated draws. Query: `?limit=30&offset=0` (max 200). Response: `{ source, total, limit, offset, draws[] }`. |

### Tools — `/api/tools`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/lapping-2/:source` | No | Two-lapping analysis. Query: `?columns=main\|machine\|all&limit=200&row1=n1,n2,n3,n4,n5&row2=n1,n2,n3,n4,n5`. `0` = wildcard. Returns `{ source, columns, total, draws, grid, columnNames, highlights, lappingRows, patternRows }`. |
| `GET` | `/lapping-3/:source` | No | Three-lapping analysis. Same structure but with `row1/row2/row3`. Defaults to built-in pattern when no rows provided. |

**Column modes:** `main` (N1–N5), `machine` (M1–M5), `all` (N1–M5 combined, 10 columns)

**Draw ordering:** Latest first (`ORDER BY event_number DESC`)

### University — `/api/university`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/courses` | No | All published courses ordered by `sort_order`. |
| `GET` | `/courses/:slug` | No | Single course with lessons list. |
| `GET` | `/courses/:slug/lessons/:lessonSlug` | No | Single lesson content. |
| `POST` | `/courses/:id/progress` | Yes | Mark lesson complete. Body: `{ lesson_id }`. |
| `GET` | `/progress` | Yes | Get user's completed lesson IDs. |

### Community — `/api/community`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/groups` | No | Paginated public groups. Query: `?limit&offset&search`. |
| `POST` | `/groups` | Yes | Create group. Body: `{ name, description, is_private, join_code? }`. |
| `GET` | `/groups/:id` | No | Group detail with member count and post count. |
| `POST` | `/groups/:id/join` | Yes | Join a group. Body: `{ join_code? }` for private groups. |
| `DELETE` | `/groups/:id/leave` | Yes | Leave a group. |
| `GET` | `/groups/:id/posts` | No | Paginated posts in a group. Query: `?limit&offset`. |
| `POST` | `/groups/:id/posts` | Yes | Create post. Body: `{ title, body, post_type, predicted_numbers? }`. |
| `DELETE` | `/groups/:id/posts/:postId` | Yes | Delete own post (or any post for group owner). |
| `GET` | `/groups/:id/posts/:postId/comments` | No | Paginated comments on a post. |
| `POST` | `/groups/:id/posts/:postId/comments` | Yes | Add comment. Body: `{ body }`. |
| `DELETE` | `/groups/:id/posts/:postId/comments/:commentId` | Yes | Delete own comment. |
| `POST` | `/push-token` | No | Register Expo push token. Body: `{ token, platform? }`. Upserts. |

### AI Predict — `/api/ai-predict`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/` | Yes | Generate AI prediction. Body: `{ source, count? }`. Uses recent draw history + Google Gemini to suggest numbers. Returns `{ prediction, reasoning }`. |

### Admin — `/api/admin`

All admin endpoints require `authenticateAdmin` (valid JWT with `role = 'admin'`). Non-admin tokens receive `403 Forbidden`.

#### Stats
| Method | Path | Description |
|---|---|---|
| `GET` | `/stats` | Platform-wide counts: users, draws, courses, lessons, groups, posts, push_tokens. Also returns `draws_by_source[]`. |

#### Draws
| Method | Path | Description |
|---|---|---|
| `POST` | `/draws` | Add a new draw result. Body: `{ source, event_number, date, n_numbers[5], m_numbers?[5] }`. Validates uniqueness, inserts normalized data, triggers push notification to all devices. |
| `GET` | `/draws/latest` | Returns `MAX(event_number)` per source. Used for auto-incrementing the event number field in the admin UI. |
| `GET` | `/draws/all` | Paginated draws. Query: `?source&limit&offset`. |
| `DELETE` | `/draws/:id` | Delete a draw and all its associated number sets/numbers (cascade). |

#### Users
| Method | Path | Description |
|---|---|---|
| `GET` | `/users` | Paginated user list. Query: `?search&limit&offset`. Search matches firstname, surname, or email. |
| `DELETE` | `/users/:id` | Permanently delete a user. |

#### Community
| Method | Path | Description |
|---|---|---|
| `GET` | `/community/groups` | Paginated groups with member count, post count, owner name. Query: `?limit&offset`. |
| `DELETE` | `/community/groups/:id` | Delete a group and all its posts/members (cascade). |
| `GET` | `/community/posts` | Paginated posts with author name, group name, comment count. Query: `?limit&offset`. |
| `DELETE` | `/community/posts/:id` | Delete a post. |

#### University
| Method | Path | Description |
|---|---|---|
| `GET` | `/university/courses` | All courses (published and draft) with `lesson_count`. |
| `POST` | `/university/courses` | Create course. Body: `{ level, level_name, title, slug, description?, icon, sort_order, is_published }`. |
| `PUT` | `/university/courses/:id` | Update course fields. |
| `DELETE` | `/university/courses/:id` | Delete course and all its lessons (cascade). |
| `GET` | `/university/courses/:id/lessons` | All lessons for a course (published and draft). |
| `POST` | `/university/lessons` | Create lesson. Body: `{ course_id, title, slug, content?, sort_order, is_published }`. |
| `PUT` | `/university/lessons/:id` | Update lesson fields. |
| `DELETE` | `/university/lessons/:id` | Delete lesson. |

#### Push Tokens
| Method | Path | Description |
|---|---|---|
| `GET` | `/push-tokens` | Paginated token list with associated user name. Query: `?limit&offset`. |
| `DELETE` | `/push-tokens/:id` | Revoke (delete) a push token. |

#### Notifications
| Method | Path | Description |
|---|---|---|
| `POST` | `/notifications/broadcast` | Broadcast push notification to all registered devices. Body: `{ title, body }`. Returns `{ sent, failed }`. |

---

## Admin Dashboard

**URL:** `/admin` on the web app. Requires `role = 'admin'` — non-admins are redirected to `/dashboard`.

**Admin section** appears in the sidebar only when the signed-in user has `role = 'admin'`.

### Tabs

| Tab | Key Features |
|---|---|
| **Overview** | Stat cards (users, draws, courses, lessons, groups, posts, push tokens), draws-by-source breakdown with progress bars, "Add New Draw" modal |
| **Draws** | Full-width table, source filter, delete with confirmation modal, sticky paginated footer |
| **Users** | Full-width table with initials avatar, debounced search, delete with confirmation modal, sticky pagination |
| **Community** | Groups / Posts toggle tabs; member count, post count; delete confirmation modals; sticky pagination per tab |
| **University** | Two-panel layout (courses left, lessons right). Courses list with edit/delete icon buttons and active-state left border. Lessons panel loads when a course is selected. CRUD modals for both courses and lessons. Published/Draft badges. |
| **Notifications** | Broadcast form (title + message, send button with spinner). Push token table with platform badge, user name, registration date, revoke action. |

---

## Admin Account Management

### Creating the first admin

Use the CLI script in `server/utils/create-admin.ts`:

```bash
cd server

# Promote an existing registered user to admin
npm run admin:create -- existing@email.com

# Create a completely new admin account
npm run admin:create -- new@email.com securepassword123
```

The script:
- If the email exists → sets `role = 'admin'` on that user
- If the email does not exist → creates a new user row with `role = 'admin'`, `firstname = 'Admin'`, `surname = 'User'`, `date_of_birth = 1990-01-01`, mobile = placeholder

After running, sign in at `/signin`. The admin link appears in the sidebar and `/admin` becomes accessible.

### How role propagates

```
DB: users.role = 'admin'
  ↓ login
JWT payload: { id, email, role: 'admin' }
  ↓ stored in localStorage.user
Frontend layout: reads user.role → allows /admin
  ↓ API call with Bearer token
Server: authenticateAdmin → checks decoded.role === 'admin' → 200 OK
```

### Revoking admin access

Run a direct SQL query on your Neon database:

```sql
UPDATE users SET role = 'user' WHERE email = 'user@example.com';
```

The user's next sign-in will issue a token with `role = 'user'`, blocking admin access. Existing sessions expire naturally (7-day JWT TTL) or when the user signs out.

---

## Push Notifications

### Server side (`utils/push.ts`)

- `sendPushToAll(title, body, data?)` — fetches all tokens from `push_tokens`, batches 100 per request, sends via Expo Push API at `https://exp.host/--/api/v2/push/send`
- Android notification channel: `draws` (high importance)
- Automatically triggered when a new draw is added via `POST /api/admin/draws`
- Manually triggered via `POST /api/admin/notifications/broadcast`

### Mobile side (`Lotto-Prophet-Mobile/`)

- Requests notification permissions on startup
- Registers Expo push token with `POST /api/community/push-token`
- Configures Android channel (`draws`, high importance)
- Foreground notification display enabled
- Tapping a notification navigates to the relevant draw detail screen

---

## Data Seeding

**Script:** `server/utils/seed-csv.ts`

| Command | Action |
|---|---|
| `pnpm run seed:alpha` | Seed Alpha Lotto from `db/alpha m.csv` |
| `pnpm run seed:lucky` | Seed Lucky Tuesday from `db/lucky.csv` |
| `pnpm run seed:all` | Seed both (clears alpha first) |
| `pnpm run seed:clear` | Delete all draw data |

**CSV formats:**
- **Alpha** (`alpha m.csv`): `Date, N1–N5, Sum, Median,, M1–M5` — event numbers auto-incremented
- **Lucky** (`lucky.csv`): `GameName, EventNum, Date, N1–N5, Sum, Median,, M1–M5` — event numbers parsed from `"EV. X"`

**Date format:** `M/D/YYYY` → normalized to `YYYY-MM-DD`

Duplicate detection: skips rows where `(date, event_number, source)` already exists.

---

## Google Drive Sync

The server periodically syncs new draw data from Google Drive folders configured in `.env`:

```env
GOOGLE_DRIVE_FOLDER_ID_NLA=...
GOOGLE_DRIVE_FOLDER_ID_NLA_RUSH=...
GOOGLE_DRIVE_FOLDER_ID_ALPHA=...
GOOGLE_DRIVE_FOLDER_ID_ALPHA_ONE=...
GOOGLE_DRIVE_FOLDER_ID_ALPHA_EXPRESS=...
```

- **`utils/sync-google-drive.ts`** — downloads new CSVs from Drive and seeds them
- **`utils/schedule-sync.ts`** — wraps `syncGoogleDrive` in a `node-cron` schedule
- **Credentials:** `server/credentials.json` (Google service account)
- Sync runs on startup and on schedule

---

## Web Application (Next.js)

**Location:** `lotto-prophet/`

### Pages

| Route | Description |
|---|---|
| `/` | Landing / marketing page |
| `/signin` | Login form |
| `/signup` | Registration form |
| `/forgot-password` | Password reset request |
| `/dashboard` | Protected user dashboard |
| `/draws` | Draw source listing (Alpha Lotto, Lucky Tuesday) |
| `/draws/[source]` | Paginated draw results table with number balls |
| `/university` | Course catalogue |
| `/university/[slug]` | Course detail with lesson list |
| `/university/[slug]/[lessonSlug]` | Lesson content viewer |
| `/tools/lapping-2` | Two-lapping pattern analysis tool |
| `/tools/lapping-3` | Three-lapping pattern analysis tool |
| `/community` | Community groups browser |
| `/buy-chart` | Chart purchase page |
| `/profile` | User profile |
| `/notifications` | Notification preferences |
| `/settings` | Account settings |
| `/subscription` | Premium plan management |
| `/contact` | Contact form |
| `/admin` | **Admin dashboard** (requires `role = 'admin'`) |
| `/admin/draws` | Admin: draws management |
| `/admin/users` | Admin: user management |
| `/admin/community` | Admin: community moderation |
| `/admin/university` | Admin: course & lesson management |
| `/admin/notifications` | Admin: push notifications & tokens |

### Sidebar navigation

The `AppSidebar` component shows the **Admin** section only when `localStorage` user has `role === 'admin'`. All other nav items are always visible to authenticated users.

### API clients

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | Login, register, forgot/reset password |
| `src/lib/draws.ts` | Fetch sources and draw results |
| `src/lib/admin.ts` | Full admin API client (stats, draws, users, community, university, push tokens, broadcast) |

### Display name mapping

| Source key | Display name |
|---|---|
| `alpha` | Alpha Lotto |
| `lucky` | Lucky Tuesday |

---

## Mobile Application (Expo)

**Location:** `Lotto-Prophet-Mobile/`

### Key screens

| Screen | Description |
|---|---|
| `index` | Landing — hero, auth card, feature cards, quick nav |
| `login` / `register` / `forgot-password` | Auth flow |
| `dashboard` | Draw sources listing (animated cards) |
| `draw-detail` | Draw results with number balls, infinite scroll |
| `university` | Course catalogue |
| `course-detail` / `lesson-detail` | University content viewer |
| `lapping-2` | Two-lapping tool (chip selectors, pattern grid, FlatList results, indigo highlights) |
| `lapping-3` | Three-lapping tool (amber highlights, Defaults button) |
| `profile` / `settings` / `notifications` | Account management |
| `community` | Community groups |
| `subscription` | Premium plans |

### API base URL

Auto-detects dev host from Expo constants. Falls back to `10.0.2.2` (Android emulator) or `localhost` (iOS simulator).

---

## Configuration

| Key | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server listen port |
| `JWT_SECRET` | — | Required. JWT signing secret |
| `NODE_ENV` | `development` | Environment flag |
| `DATABASE_URL` | — | Required. Neon PostgreSQL connection string |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Web app API base URL |
| JWT expiry | 7 days | Configurable in `config/index.ts` |
| Reset token expiry | 1 hour | Configurable in `config/index.ts` |

---

## Known Gaps / TODOs

| Status | Item |
|---|---|
| ✅ | MySQL → PostgreSQL (Neon) migration complete |
| ✅ | Role-based admin access (`role` column, `authenticateAdmin` middleware, JWT payload) |
| ✅ | Full admin dashboard (draws, users, community, university, notifications) |
| ✅ | Lapping 2 & 3 — fully implemented (server, web, mobile) |
| ✅ | University system — courses and lessons with CRUD |
| ✅ | Community — groups, posts, comments, likes, bans |
| ✅ | Push notifications — broadcast and per-draw auto-notify |
| ✅ | Google Drive auto-sync |
| ✅ | AI prediction endpoint (Gemini) |
| ⬜ | Email service — forgot-password returns token in API response; no email sent |
| ⬜ | Predictions UI — table and model exist but no user-facing interface |
| ⬜ | Push token user association — tokens registered anonymously; `user_id` not populated |
| ⬜ | User profile edit — no API route for updating name, phone, or changing password |
| ⬜ | `/me` endpoint — mobile does not re-fetch user profile on token restore |
| ⬜ | Admin role revocation UI — currently requires direct SQL; no admin-facing UI to demote users |
