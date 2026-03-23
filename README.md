# Eurovision Stats

Mobile-first Eurovision room voting with a Neon Arena frontend, live stage boards, and room leaderboards.

## Requirements

- Node.js 20+ with `npm`
- Docker Desktop optional, if you want to run everything via containers

## Project Layout

```text
eurovision_project/
|-- backend/
|   `-- backend_core/   # Express + Socket.IO API, stage catalog, legacy static pages
`-- frontend/           # Next.js room portal, vote flow, acts guide, live boards
```

## Local Run

### 1. Backend

```powershell
cd backend\backend_core
$env:PORT = 4000
$env:ADMIN_KEY = "dev-admin-key"
$env:ADMIN_EMAIL = "host@example.com"
$env:ADMIN_PASSWORD = "change-me-now"
$env:CLIENT_ORIGIN = "http://localhost:3000"
$env:APP_PUBLIC_URL = "http://localhost:3000"
$env:SMTP_HOST = "smtp.example.com"
$env:SMTP_PORT = "587"
$env:SMTP_SECURE = "false"
$env:SMTP_USER = "smtp-user"
$env:SMTP_PASS = "smtp-pass"
$env:SMTP_FROM = "Neon Arena <no-reply@example.com>"
node server.js
```

Backend runs on `http://localhost:4000`.

Useful backend routes:

- `http://localhost:4000/api/rooms`
- `http://localhost:4000/api/acts?room=neon-arena&stage=final`
- `http://localhost:4000/api/leaderboard?room=neon-arena`
- `http://localhost:4000/admin.html`

### 2. Frontend

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

Main app routes:

- `http://localhost:3000/` - room portal
- `http://localhost:3000/neon-arena` - room hub
- `http://localhost:3000/neon-arena/vote/final` - mobile ballot flow
- `http://localhost:3000/neon-arena/acts/final` - artist guide
- `http://localhost:3000/neon-arena/live/final` - projector-ready stage results
- `http://localhost:3000/neon-arena/players/overall` - room standings
- `http://localhost:3000/neon-arena/stats` - season archive and player accuracy stats
- `http://localhost:3000/admin?room=neon-arena` - host control room

## Docker Compose

```powershell
docker compose up --build
```

Containers will be available on:

- `http://localhost:4000` - backend
- `http://localhost:3000` - frontend

## What Is Already Fixed

- Rankings are stored separately for `semi1`, `semi2`, and `final`
- Locked ballots are enforced server-side
- Ranking payloads are validated and reject duplicates or unknown entries
- Backend is room-aware and stage-aware
- Next.js frontend now uses the real API and live room events
- The app now has distinct routes for room hub, voting, acts, live results, and player standings
- Admin control now lives in the Next.js frontend and uses an admin session cookie instead of browser-side `x-admin` headers
- Voting windows can be opened and closed independently for `semi1`, `semi2`, and `final`
- Scoring profiles and tie-break logic are configurable per room
- Legal pages, consent copy, and public-display notices now have production-ready placeholders and explicit env configuration
- Season archive stats now expose per-player exact hits, close calls, average distance, and best stage

## Current Limitations

- Data is persisted to a local JSON state file, but not yet migrated to a real database
- The room list is still seeded in code, not in a database
- Final-stage act context is implemented, but semi-final national-selection placement still needs a curated data source to be fully accurate
- Legacy static pages in `backend/backend_core/public` still exist alongside the new frontend
- Password recovery emails are intentionally disabled in production until a real mail provider is integrated; local development still exposes a preview reset link

## Frontend Env

Set these in `frontend/.env.local` before public launch:

- `NEXT_PUBLIC_API_BASE`
- `NEXT_PUBLIC_OPERATOR_NAME`
- `NEXT_PUBLIC_OPERATOR_CONTACT`
- `NEXT_PUBLIC_DATA_REGION`
- `NEXT_PUBLIC_DATA_RETENTION`
- `NEXT_PUBLIC_PUBLIC_DISPLAY_NOTICE`

## Backend Env

Set these in `backend/backend_core/.env` or your hosting dashboard secrets:

- `PORT`
- `CLIENT_ORIGIN`
- `APP_PUBLIC_URL`
- `ADMIN_KEY` for fallback legacy host access
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Production Domain Example

For `morozoveuroparty.ru`, the production values should look like this:

```env
CLIENT_ORIGIN=https://morozoveuroparty.ru
APP_PUBLIC_URL=https://morozoveuroparty.ru
NEXT_PUBLIC_API_BASE=https://api.morozoveuroparty.ru
NEXT_PUBLIC_DATA_REGION=Russian Federation
```

## Tonight's Hosting Notes

- Set `CLIENT_ORIGIN` to the public frontend origin that is allowed to call the backend
- Set `APP_PUBLIC_URL` to the public frontend origin that users open in the browser
- Prefer `ADMIN_EMAIL` + `ADMIN_PASSWORD` for the new control room and keep `ADMIN_KEY` only as a fallback
- User avatars and artist card media now live under `backend/backend_core/public/uploads` and `backend/backend_core/public/media`
- If you refresh the 2026 artist pack later, run `powershell -ExecutionPolicy Bypass -File backend/backend_core/sync-local-media.ps1`
- If `SMTP_*` env vars are configured, password recovery now sends real emails; otherwise production disables recovery and development falls back to preview links
- Legacy `admin.html` now redirects to the new Next control room route
