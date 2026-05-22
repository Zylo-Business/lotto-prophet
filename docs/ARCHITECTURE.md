# Architecture

## Overview
Monorepo with:
- `server/` Express + TypeScript REST API
- `lotto-prophet/` Next.js frontend
- `Lotto-Prophet-Mobile/` Expo mobile app

## Data flow
1) Draws are stored in PostgreSQL with normalized tables.
2) `server` builds a flat/pivot view `v_draws_flat`.
3) Lapping tools query the view to detect vertical matching patterns.

## Key runtime
- `server/index.ts` initializes DB schema on startup and mounts route handlers.

