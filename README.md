# Job Application Tracker

MERN application for tracking job applications with AI-assisted parsing and resume suggestions.

## Features

- Email/password authentication with JWT
- Drag-and-drop Kanban board for job pipeline tracking
- AI-powered job description parsing
- AI-generated resume bullet suggestions
- Production-oriented API hardening (CORS allowlist, request limits, health checks)

## Stack

- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Node.js + Express + TypeScript + Mongoose
- Database: MongoDB
- AI: OpenAI API

## Local Development

1. Backend setup:
   - `cd backend`
   - `npm install`
   - Create `backend/.env` from `backend/.env.example`
   - `npm run dev`
2. Frontend setup:
   - `cd frontend`
   - `npm install`
   - Create `frontend/.env` from `frontend/.env.example` (optional for local)
   - `npm run dev`
3. Open `http://localhost:5173`

## Build Commands

- Backend build: `cd backend && npm run build`
- Frontend build: `cd frontend && npm run build`
- Backend production start: `cd backend && npm run start`

## Environment Variables

### Backend (`backend/.env`)

- `NODE_ENV` (`development` | `production`)
- `PORT` (default `5000`)
- `MONGO_URI` (required)
- `JWT_SECRET` (required, minimum 32 chars)
- `JWT_EXPIRES_IN` (default `30d`)
- `CORS_ORIGINS` (comma-separated allowlist, for example `https://app.example.com`)
- `OPENAI_API_KEY` (required for AI endpoints)
- `OPENAI_MODEL` (default `gpt-4o-mini`)
- `RATE_LIMIT_WINDOW_MS` (default `900000`)
- `RATE_LIMIT_MAX_REQUESTS` (default `300`)

### Frontend (`frontend/.env`)

- `VITE_API_BASE_URL`:
  - Keep empty when frontend and backend share same domain and `/api` path.
  - Set to full backend URL when hosted separately, for example `https://api.example.com/api`.
- `VITE_DEV_API_PROXY_TARGET` (default `http://localhost:5000`)

## Production Deployment Checklist

1. Configure backend env values, especially `JWT_SECRET`, `MONGO_URI`, `CORS_ORIGINS`.
2. Configure frontend `VITE_API_BASE_URL` based on hosting topology.
3. Build backend and frontend artifacts in CI/CD.
4. Serve frontend static `dist/` files from your hosting platform.
5. Run backend with `NODE_ENV=production` and monitor `/health`.
6. Verify login, application CRUD, and AI endpoints in production environment.
