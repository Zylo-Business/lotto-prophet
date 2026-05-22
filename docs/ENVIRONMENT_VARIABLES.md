# Environment Variables

## Backend (server/)

Required:
- `DATABASE_URL`
- `JWT_SECRET` (optional in code, but required in practice)

Example placeholders:
- See `server/.env.example`

## Frontend (lotto-prophet/)

Required (commonly):
- `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001` in code)

## Mobile (Lotto-Prophet-Mobile/)

Mobile app uses its own runtime config.
- Ensure it can reach the deployed API host.
- For local dev it often uses `localhost`/emulator mappings.

