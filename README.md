# Dealer Dev Ops

This repository currently runs on `server.js` with SQLite (`cars.db`) as the active local runtime.

## Runtime Target

- Active runtime: `server.js` (Node.js + Express + SQLite)
- API health endpoint: `GET /health`
- Frontend: static files from `public/`

## Prerequisites

- Node.js 18+
- npm 9+

## Quick Start

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Scripts

- `npm start` - start active runtime (`server.js`)
- `npm run dev` - start runtime with `nodemon`
- `npm run start:pg` - start PostgreSQL runtime (`server_pg.js`)
- `npm run db:pg:init` - initialize PostgreSQL schema + seed data
- `npm run type-check` - run TypeScript compile check for `src/`
- `npm run test:smoke` - start server and verify `GET /health`
- `npm run ci` - run `type-check` then smoke test

## Hybrid DB Setup (Your Order)

### Step 1: Scraper First

1. Start app:
   - `npm start`
2. Open UI:
   - `http://localhost:3000`
3. Use Scraper page:
   - Enter `Source Name`
   - Paste a curl command
   - Run scrape
4. API option (if preferred):
   - `POST /api/test` to validate extraction
   - `POST /api/scrape` to save into DB

### Step 2: SQL DB First (PostgreSQL Source of Truth)

1. Set PostgreSQL connection:
   - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/summit_auto`
2. Initialize schema + seed:
   - `npm run db:pg:init`
3. Start PostgreSQL runtime:
   - `npm run start:pg`
4. Verify:
   - `GET http://localhost:3000/api/health`

Notes:
- SQL schema/seed file is `docs/placeholder_data.sql`.
- Next phase for hybrid search is adding vectors/embeddings keyed by SQL `vehicles.id`.

## Documentation

- Progress tracker: `docs/PROGRESS_UPDATE.md`
- Azure cloud setup runbook: `docs/AZURE_SETUP.md`

## Production Readiness Files

- `Dockerfile` - production container image for Azure Web App
- `.env.production.example` - production env template (no secrets committed)
- `.github/workflows/azure-webapp.yaml` - CI/CD workflow (type-check + smoke + deploy)

## Current Architecture

- `server.js` - active JS/SQLite API runtime
- `db.js` - SQLite data access
- `scraper.js` - curl-based scraping and extraction
- `src/` - TypeScript API/domain layer under active repair and type-check gating
  - `src/index.ts` - TS API entrypoint (not the active runtime)
  - `src/api/routes/` - TS routes
  - `src/services/` - TS service layer
  - `src/repositories/` - TS repository layer

## Main API Endpoints (Active Runtime)

- `GET /health` - process health
- `GET /api/inventory` - list inventory
- `POST /api/scrape` - scrape inventory from curl input
- `POST /api/scrape/batch` - batch scrape
- `DELETE /api/inventory/:id` - delete one
- `DELETE /api/inventory` - clear all
- `GET /api/stats` - summary stats

## Notes

- `server_pg.js` and TS/Postgres files remain in the repo for future migration work.
- If you switch active runtime later, update `package.json` scripts and this README together.
- Security defaults now include `helmet`, API rate limiting, and CORS origin allowlisting via `CORS_ORIGINS`.
