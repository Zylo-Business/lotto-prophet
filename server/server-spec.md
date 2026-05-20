# Lotto Prophet — Server & Application Specification

> Last updated: February 18, 2026

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Server](#server)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Authentication](#authentication)
6. [Push Notifications](#push-notifications)
7. [Data Seeding](#data-seeding)
8. [Web Application (Next.js)](#web-application-nextjs)
9. [Mobile Application (Expo/React Native)](#mobile-application-exporeact-native)
10. [Admin Panel](#admin-panel)
11. [Tools](#tools)
12. [Configuration](#configuration)
13. [Known Gaps / TODOs](#known-gaps--todos)

---

## Architecture Overview

| Component | Stack | Port |
|---|---|---|
| **Server/API** | Express 5 + TypeScript (ESM), MySQL via `mysql2/promise` | `3001` |
| **Web App** | Next.js (App Router), Tailwind CSS v4, shadcn/ui, Radix | `3000` |
| **Mobile App** | Expo SDK 54, React Native, Expo Router (Drawer navigation) | Expo Dev |
| **Database** | MySQL (localhost, `lotto` database) | `3306` |
| **Push Service** | Expo Push Notification Service | — |

---

## Server

- **Entry:** `server/index.ts`
- **Runtime:** Node.js with `ts-node/esm` loader
- **Middleware:** CORS (open), Morgan (dev logging), `express.json()`
- **Listens on:** `0.0.0.0:3001`

### Route Registration

| Prefix | Module |
|---|---|
| `/api/auth` | `routes/auth.ts` |
| `/api/draws` | `routes/draws.ts` |
| `/api/admin` | `routes/admin.ts` |
| `GET /` | Health-check |

---

## Database Schema

Database: `lotto` on MySQL (root, no password, connection pool of 10)

### Tables

#### `days`
| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | |
| `date` | VARCHAR(10) UNIQUE | `YYYY-MM-DD` |
| `year` | INT | |
| `month` | INT | |
| `day` | INT | |
| `weekday` | INT | 0=Sunday … 6=Saturday |
| `weekday_name` | VARCHAR(20) | |

#### `draws`
| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | |
| `event_number` | INT NOT NULL | |
| `day_id` | INT FK → days(id) | |
| `source` | VARCHAR(50) DEFAULT 'alpha' | `'alpha'` or `'lucky'` |

#### `number_sets`
| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | |
| `draw_id` | INT FK → draws(id) CASCADE | |
| `set_type` | ENUM('N','M') | N = draw numbers, M = machine numbers |

#### `numbers`
| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | |
| `number_set_id` | INT FK → number_sets(id) CASCADE | |
| `position` | INT | 1–5 |
| `value` | INT | |

#### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | |
| `firstname` | VARCHAR(100) | |
| `surname` | VARCHAR(100) | |
| `email` | VARCHAR(191) UNIQUE | |
| `country_code` | VARCHAR(10) | e.g. `+233` |
| `mobile_number` | VARCHAR(20) | 10 digits |
| `referral_code` | VARCHAR(50) DEFAULT NULL | optional |
| `password_hash` | VARCHAR(255) | bcrypt |
| `date_of_birth` | DATE | must be 18+ |
| `reset_token` | VARCHAR(255) DEFAULT NULL | SHA-256 hashed |
| `reset_token_expires` | DATETIME DEFAULT NULL | 1-hour expiry |
| `created_at` | TIMESTAMP | |
| UNIQUE KEY | `(country_code, mobile_number)` | |

#### `predictions`
| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | |
| `user_id` | INT FK → users(id) | |
| `predicted_numbers` | TEXT | JSON string |
| `prediction_date` | DATE | |

#### `push_tokens`
| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | |
| `user_id` | INT FK → users(id) CASCADE, DEFAULT NULL | |
| `token` | VARCHAR(191) UNIQUE | Expo push token |
| `platform` | VARCHAR(20) DEFAULT 'unknown' | `android`, `ios`, etc. |
| `created_at` | TIMESTAMP | |

### View: `v_draws_flat`

Pivots normalized draw data into a single flat row per draw:

```
event_number | date | source | N1 N2 N3 N4 N5 | n_sum | M1 M2 M3 M4 M5 | m_sum
```

---

## API Endpoints

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | No | Create account. Body: `{ firstname, surname, email, country_code, mobile_number, password, date_of_birth, referral_code? }`. Validates email, 10-digit mobile, 18+ age, 8-char password. Returns `{ message, token, user }`. |
| `POST` | `/login` | No | Login. Body: `{ identifier, password }`. Identifier can be email or phone number. Returns `{ message, token, user }`. |
| `POST` | `/forgot-password` | No | Request password reset. Body: `{ email }`. Generates reset token (1-hour expiry). Returns `{ message, reset_token }`. |
| `POST` | `/reset-password` | No | Reset password. Body: `{ token, new_password }`. Validates token, updates password. Returns `{ message }`. |

### Draws — `/api/draws`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/sources` | No | Returns distinct draw sources with counts. Response: `[{ source, draw_count }]`. |
| `GET` | `/:source` | No | Paginated draws for a source. Query: `?limit=30&offset=0` (max 200). Response: `{ source, total, limit, offset, draws[] }`. |

### Tools — `/api/tools`

| Method | Path | Auth | Description |
|---|---|---|
| `GET` | `/lapping-2/:source` | No | Two-lapping analysis. Query: `?columns=main|machine|all&limit=200&row1=...&row2=...`. Rows are comma-separated numbers (column-aligned, 0 = wildcard). Returns draws ordered by `event_number DESC` (latest first), grid, highlights, lappingRows, patternRows. |
| `GET` | `/lapping-3/:source` | No | Three-lapping analysis. Query: `?columns=main|machine|all&limit=200&row1=...&row2=...&row3=...`. If no rows provided, uses default pattern. Returns same structure as lapping-2. |

### Admin — `/api/admin`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/draws` | **Yes** | Add new draw result. Body: `{ source, event_number, date, n_numbers[5], m_numbers?[5] }`. Validates, checks duplicates, inserts data, sends push notification to all devices. Returns `{ message, draw_id }`. |
| `GET` | `/draws/latest` | **Yes** | Returns `MAX(event_number)` per source for auto-increment. Response: `[{ source, latest_event }]`. |
| `POST` | `/push-token` | No | Register device push token. Body: `{ token, platform? }`. Upserts into `push_tokens`. |

---

## Authentication

- **JWT** with secret `tony4prophet` (env: `JWT_SECRET`), 7-day expiry
- **Middleware:** `authenticate` extracts Bearer token from `Authorization` header, verifies and attaches `{ id, email }` to `req.user`
- **Password:** bcrypt hashed
- **Reset tokens:** SHA-256 hashed, 1-hour expiry
- **Storage (web):** `localStorage` (`token`, `user`)
- **Storage (mobile):** `expo-secure-store`

---

## Push Notifications

### Server Side
- **Utility:** `server/utils/push.ts` — `sendPushToAll(title, body, data?)`
- Fetches all tokens from `push_tokens` table
- Sends via Expo Push API (`https://exp.host/--/api/v2/push/send`) in batches of 100
- Android notification channel: `draws`
- Triggered automatically when a new draw is added via admin endpoint

### Mobile Side
- **Setup:** `app/lib/push.ts`
- Requests notification permissions on app startup
- Registers Expo push token with server (`POST /api/admin/push-token`)
- Configures Android notification channel (`draws`, high importance)
- Foreground notification display enabled
- Tapping a notification navigates to the relevant draw detail screen

---

## Data Seeding

- **Utility:** `server/utils/seed-csv.ts`
- **CSV formats supported:**
  - **Alpha** (`alpha m.csv`): `Date,N1–N5,Sum,Median,,M1–M5` — event numbers auto-incremented, source = `'alpha'`
  - **Lucky** (`lucky.csv`): `GameName,EventNum,Date,N1–N5,Sum,Median,,M1–M5` — event numbers parsed from "EV. X", source = `'lucky'`
- Date format: `M/D/YYYY` → `YYYY-MM-DD`
- Skips duplicates by `(date, event_number, source)`
- **CLI commands:**
  - `pnpm run seed:alpha` — seed alpha data
  - `pnpm run seed:lucky` — seed lucky data
  - `pnpm run seed:all` — seed both (clears alpha first)
  - `pnpm run seed:clear` — clear all draw data

---

## Web Application (Next.js)

**Location:** `lotto-prophet/`

### Pages

| Route | Type | Description |
|---|---|---|
| `/` | SSR | Landing/marketing page |
| `/signin` | Client | Login form |
| `/signup` | Client | Registration form |
| `/forgot-password` | Client | Password reset request form |
| `/dashboard` | Client | Protected dashboard with stats cards, activity feed, quick actions |
| `/draws` | Client | Lists all draw sources (Alpha Lotto, Lucky Tuesday) as cards. Click to view details. |
| `/draws/[source]` | Client | Table view of draw results for a source. Number balls with colors, sums, pagination with "Load More". Breadcrumb navigation. |
| `/university` | Client | Course listing page for the Lotto Prophet University (Foundation, Lapping, Advanced). |
| `/university/[slug]` | Client | Course detail page with lesson list. |
| `/university/[slug]/[lessonSlug]` | Client | Individual lesson viewer with navigation between lessons. |
| `/buy-chart` | Client | Purchase page for lottery analysis charts. |
| `/tools/lapping-2` | Client | Lapping 2 analysis tool — two-number overlapping pattern analysis. Source/columns/limit selectors, column-aligned pattern grid (2 rows), fill from draw (latest first), results table with indigo highlights, stats badges. |
| `/tools/lapping-3` | Client | Lapping 3 analysis tool — three-number overlapping pattern analysis. Source/columns/limit selectors, column-aligned pattern grid (3 rows, with defaults), fill from draw (latest first), results table with amber highlights, stats badges. |
| `/admin` | Client | Admin panel for adding new draw results (not linked in navbar — accessed directly at `/admin`). |
| `/wiki/[id]` | SSR | View article (mock data) |
| `/wiki/edit/new` | Client | Create new article |
| `/wiki/edit/[id]` | SSR | Edit article (mock data) |
| `/handler/[...stack]` | — | Stack Auth catch-all handler |

### Navigation

#### Sidebar (`app-sidebar.tsx`)
- Collapsible sidebar (hidden on auth pages)
- **Main:** Home, Draws (always visible)
- **Learn & Shop:** University, Buy My Chart (always visible, with section label)
- **Tools** (collapsible dropdown): Lapping 2, Lapping 3
- **Account** (collapsible dropdown): Profile, Notifications, Settings, Subscription
- **Support** (collapsible dropdown): Contact
- User greeting badge (when logged in)
- Theme toggle (light/dark) in sidebar footer
- Sign out button in footer
- Mobile: hamburger button + overlay, close button
- Desktop: collapse/expand toggle

#### Top Navbar (`nav-bar.tsx`)
- Logo + brand name linking to dashboard (or landing if logged out)
- Theme toggle button
- When logged in: Draws, University, **Tools** hover dropdown (Lapping 2, Lapping 3), **Account** hover dropdown (Profile, Notifications, Settings, Subscription, Contact), user greeting, logout
- When logged out: Sign In, Sign Up buttons
- Admin panel is **not** in navigation — accessed directly at `/admin`

### Styling
- Tailwind CSS v4 with CSS custom properties (oklch colors)
- shadcn/ui components (Card, Button, Input, Label, Badge, NavigationMenu)
- Light/dark theming via `next-themes`

### API Communication
- Axios to `NEXT_PUBLIC_API_URL || http://localhost:3001`
- Auth lib: `src/lib/auth.ts`
- Draws lib: `src/lib/draws.ts`

### Display Name Mapping
| Source | Display Name |
|---|---|
| `alpha` | Alpha Lotto |
| `lucky` | Lucky Tuesday |

### Draw Data Labels
| Label | Description |
|---|---|
| Draw | Main 5 numbers (N1–N5) |
| Machine | Secondary 5 numbers (M1–M5) |

---

## Mobile Application (Expo/React Native)

**Location:** `Lotto-Prophet-Mobile/`

### Navigation
- **Drawer** navigation (expo-router/drawer)
- **Main:** Home, Draws (always visible)
- **Learn & Shop:** University, Buy My Chart (always visible, with section label)
- **Tools** (collapsible dropdown): Lapping 2, Lapping 3
- **Account** (collapsible dropdown): Profile, Notifications, Settings, Subscription
- **Support** (collapsible dropdown): Contact
- **Dark mode toggle** in drawer footer (Switch component, toggles light/dark)
- Auth screens (login, register, forgot-password, splash) hidden from drawer

### Screens

| Screen | Description |
|---|---|
| `index` | **Landing page** — hero with logo, stats row (Accuracy, Users, Predictions), auth card (login/register or welcome-back with dashboard link), feature cards (Smart Analytics, Hot Numbers, Statistics, Alerts), quick navigation grid (Dashboard, Notifications, Profile, Contact, University, Buy My Chart, Settings, Subscription), footer disclaimer. |
| `splash` | Splash screen |
| `login` | Login form |
| `register` | Registration form |
| `forgot-password` | Password reset form |
| `dashboard` | **Draws list** — fetches draw sources from API, displays as animated cards. Tap to view draw data. |
| `draw-detail` | **Draw data** — fetches paginated draw results for a source. Shows number balls (Draw + Machine), sums, infinite scroll pagination. Default: 30 draws. |
| `notifications` | Notifications screen |
| `profile` | User profile |
| `contact` | Contact form |
| `settings` | App settings — Dark Mode toggle, Biometric Login, Change Password, 2FA, Analytics, Privacy Policy, Terms of Service, App Version, Rate, Share, Sign Out, Delete Account. |
| `subscription` | Premium plans |
| `university` | Course listing for Lotto Prophet University |
| `buy-chart` | Purchase page for lottery analysis charts |
| `course-detail` | Course detail with lesson list |
| `lesson-detail` | Individual lesson viewer |
| `lapping-2` | **Lapping 2 tool** — two-number overlapping pattern analysis. Source/columns/limit chip selectors, column-aligned pattern grid (2 rows), fill from draw chips (latest first), search/clear buttons, FlatList results with indigo highlights, stats badges, floating side nav rail. |
| `lapping-3` | **Lapping 3 tool** — three-number overlapping pattern analysis. Source/columns/limit chip selectors, column-aligned pattern grid (3 rows, with defaults), fill from draw chips (latest first), search/clear/defaults buttons, FlatList results with amber highlights, stats badges, floating side nav rail. |

### Theming
- Light/dark/system modes via `ThemeContext`
- Persisted in `expo-secure-store`
- Custom color palette with primary (#6C63FF / #8B83FF dark), accent (#FF6B6B), etc.
- **Dark mode toggle** accessible in two places:
  1. Drawer footer (Switch widget)
  2. Settings screen (Switch in Appearance section)

### API Communication
- Auto-detects dev host IP from Expo constants
- Falls back to `10.0.2.2` (Android emulator) or `localhost` (iOS)
- Auth lib: `app/lib/auth.ts`
- Draws lib: `app/lib/draws.ts`
- Push lib: `app/lib/push.ts`

### Push Notifications
- Registers for push on app startup
- Foreground notifications shown as alerts
- Tapping a notification navigates to draw detail screen

---

## Admin Panel

**Access:** `/admin` on the web app (not linked in navigation)

### Features
- **Draw source selector** — Alpha Lotto or Lucky Tuesday toggle buttons
- **Auto-incrementing event number** — fetches latest event number per source, pre-fills next number
- **Date picker** — defaults to today's date
- **Draw numbers input** — 5 number fields (1–90) for main draw numbers
- **Machine numbers input** — toggleable, 5 number fields (1–90)
- **Validation** — numbers 1–90, required fields, duplicate draw detection
- **Latest draws badge** — shows current latest event number per source
- **Push notification** — automatically sent to all registered devices on submission
- **Auth required** — must be logged in (Bearer token from localStorage)

---

## Tools

Analysis tools available under the **Tools** section in both web and mobile navigation.

### Server Implementation (`server/routes/tools.ts`)

- **Route prefix:** `/api/tools`
- **Database view:** `v_draws_flat`, ordered by `event_number DESC` (latest draw first)
- **Helpers:**
  - `parseRowParam(param, numCols)` — parses comma-separated row into number[], 0 for empty/invalid, clamps 1–90
  - `hasNonZero(rows)` — returns true if any cell is non-zero
  - `getColumnNames(mode)` — returns column names for `main` (N1–N5), `machine` (M1–M5), or `all` (N1–N5, M1–M5)

#### Response schema (both routes)

```json
{
  "source": "alpha",
  "columns": "main",
  "total": 200,
  "draws": [ /* v_draws_flat rows, latest first */ ],
  "grid": [ /* number[][] — extracted column values per draw */ ],
  "columnNames": ["N1","N2","N3","N4","N5"],
  "highlights": [ /* boolean[][] — true where pattern matched */ ],
  "lappingRows": [ /* number[] — row indices that participate in a match */ ],
  "patternRows": [ /* number[][] — the pattern used for matching */ ]
}
```

### Lapping 2
- **API route:** `GET /api/tools/lapping-2/:source`
- **Web route:** `/tools/lapping-2`
- **Mobile screen:** `lapping-2`
- **Purpose:** Two-number overlapping pattern analysis — identifies pairs of numbers that repeat (lap) in the same column across consecutive draws.
- **Status:** Fully implemented (server, web, mobile).
- **Pattern matching modes:**
  - **With pattern (row1/row2 provided, non-zero):** Column-specific — slides a 2-row window through draws. For each column c, checks if `data[r][c]` matches `row1[c]` AND `data[r+1][c]` matches `row2[c]`. Value 0 = wildcard.
  - **Without pattern (all zeros or absent):** Default — detects any identical value in the same column across two consecutive draws.
- **Draw ordering:** Latest first (`ORDER BY event_number DESC`)

### Lapping 3
- **API route:** `GET /api/tools/lapping-3/:source`
- **Web route:** `/tools/lapping-3`
- **Mobile screen:** `lapping-3`
- **Purpose:** Three-number overlapping pattern analysis — identifies triplets of numbers that repeat (lap) in the same column across three consecutive draws.
- **Status:** Fully implemented (server, web, mobile).
- **Pattern matching:** Column-specific — slides a 3-row window. For each column c, checks `data[r][c]` vs `row1[c]`, `data[r+1][c]` vs `row2[c]`, `data[r+2][c]` vs `row3[c]`. Value 0 = wildcard.
- **Default pattern:** `[61,60,17,8,75], [55,28,11,6,47], [53,29,22,75,82]`
- **Draw ordering:** Latest first (`ORDER BY event_number DESC`)

### UI Features (Web & Mobile)

| Feature | Web (Next.js) | Mobile (Expo) |
|---|---|---|
| **Source selector** | Select dropdown | Horizontal chip scroll |
| **Columns selector** | Select (Main / Machine / All) | Chip scroll |
| **Limit selector** | Select (50–2000) | Chip scroll |
| **Pattern grid** | Inline number inputs per column (N1–N5 / M1–M5), one input row per pattern row | Same layout with column headers |
| **Fill from draw** | Select dropdown showing event numbers (latest first) — fills pattern rows from consecutive draws starting at selected index | Horizontal chip scroll showing event numbers (latest first) |
| **Cross-game search** | Checkboxes for additional sources ("Also search in") — runs pattern search across all selected sources in parallel | Chip scroll for additional sources ("Also search in") |
| **Cross-game summary** | Clickable summary cards per source (draws, hits, rate) below pattern grid — click to scroll to that source’s detail table | Clickable summary cards per source — tap to switch primary source |
| **Cross-game detail tables** | Full results table per additional source below the main table | N/A (tap summary card to switch primary) |
| **Clear / Defaults / Search** | Buttons in pattern section | Buttons below grid |
| **Results table** | Responsive table with highlighted lapping cells, indigo (L2) / amber (L3) accent | FlatList with highlighted cells |
| **Stats badges** | Total draws, lapping events found, hit rate | Same |
| **Side navigation rail** | N/A | Floating vertical rail with quick nav (Dashboard, Draws, Lapping-2, Lapping-3, University, Buy Chart) |

---

## Configuration

| Key | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server port |
| `JWT_SECRET` | `tony4prophet` | JWT signing secret |
| JWT expiry | 7 days | Token lifetime |
| Reset token expiry | 1 hour | Password reset token lifetime |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Web app API base URL |

---

## Known Gaps / TODOs

- [x] **Lapping 2 logic** — fully implemented (server, web, mobile) with column-specific pattern matching
- [x] **Lapping 3 logic** — fully implemented (server, web, mobile) with column-specific pattern matching
- [x] **Lapping API endpoints** — `GET /api/tools/lapping-2/:source` and `GET /api/tools/lapping-3/:source`
- [x] **Fill from draw** — users can populate pattern grid from actual draw data (latest first)
- [ ] **Predictions** — table + interface exist but no API routes
- [ ] **Email service** — forgot-password returns token in response (no email sent)
- [ ] **Role-based admin access** — any authenticated user can add draws (no admin role check)
- [ ] **User profile update** — no route for profile edit, delete account, or change password
- [ ] **Push token user association** — `push_tokens.user_id` column exists but is never populated (tokens registered anonymously)
- [ ] **`/me` endpoint** — mobile app doesn't fetch user profile on token restore
- [ ] **Settings page (web)** — no `/settings` or `/notifications` page implemented on the web app yet