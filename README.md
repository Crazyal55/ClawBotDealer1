# Dealer Dev Ops

This repository now runs on `server_pg.js` with PostgreSQL as the active runtime.

## Hosting Decision

- This app (Dealer Dev Ops data/scraper platform) is hosted on your VPS.
- Azure is reserved for the separate Dealer SaaS + chatbot site.

## Runtime Target

- Active runtime: `server_pg.js` (Node.js + Express + PostgreSQL)
- API health endpoints: `GET /api/health` and `GET /api/health/db`
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

- `npm start` - start active runtime (`server_pg.js`)
- `npm run dev` - start active runtime with `nodemon` (`server_pg.js`)
- `npm run start:pg` - alias for PostgreSQL runtime (`server_pg.js`)
- `npm run start:sqlite` - legacy SQLite runtime (`server.js`)
- `npm run db:pg:init` - initialize PostgreSQL schema + seed data
- `npm run type-check` - run TypeScript compile check for `src/`
- `npm run test:smoke` - start active runtime and verify `GET /api/health/db`
- `npm run ci` - run `lint`, `type-check`, then smoke test

## Hybrid DB Setup (Your Order)

### Step 1: Scraper First (PostgreSQL Runtime)

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
   - `npm start` (or `npm run start:pg`)
4. Verify:
   - `GET http://localhost:3000/api/health`
   - `GET http://localhost:3000/api/health/db`

Notes:
- SQL schema/seed file is `docs/placeholder_data.sql`.
- Next phase for hybrid search is adding vectors/embeddings keyed by SQL `vehicles.id`.

## Documentation

- Progress tracker: `docs/PROGRESS_UPDATE.md`
- SQL ingestion contract: `docs/INGESTION_CONTRACT.md`
- VPS deployment runbook: `docs/VPS_DEPLOY.md`
- Azure reference runbook (for separate SaaS/chatbot stack): `docs/AZURE_SETUP.md`

## Production Readiness Files

- `Dockerfile` - production container image (usable on VPS)
- `.env.production.example` - production env template (no secrets committed)
- `.github/workflows/azure-webapp.yaml` - optional Azure CI/CD workflow for separate stack
- `pg_pool.js` - PostgreSQL connection pooling framework (env-driven)
- `docs/VPS_DEPLOY.md` - VPS deployment guide (systemd + Nginx + TLS)
- `scripts/deploy_vps.sh` - VPS deploy/update script
- `scripts/backup-database.sh` - backup script with retention
- `scripts/restore-drill.sh` - restore verification drill from latest backup
- `scripts/health-monitor-24h.sh` - 24h health monitor for staging stability
- `scripts/car-scraper.service` - systemd unit template
- `scripts/nginx-dealer-dev-ops.conf` - Nginx reverse proxy template

## Current Architecture

- `server_pg.js` - active PostgreSQL API runtime
- `db_pg.js` - PostgreSQL data access
- `server.js` / `db.js` - legacy SQLite fallback runtime/data layer
- `scraper.js` - curl-based scraping and extraction
- `src/` - TypeScript API/domain layer under active repair and type-check gating
  - `src/index.ts` - TS API entrypoint (not the active runtime)
  - `src/api/routes/` - TS routes
  - `src/services/` - TS service layer
  - `src/repositories/` - TS repository layer

## Main API Endpoints (Active Runtime)

- `GET /api/health` - process health
- `GET /api/health/db` - DB + pool health
- `GET /api/inventory` - list inventory
- `POST /api/scrape` - scrape inventory from curl input
- `POST /api/scrape/batch` - batch scrape
- `DELETE /api/inventory/:id` - delete one
- `DELETE /api/inventory` - clear all
- `GET /api/stats` - summary stats
- `GET /api/dealerships/overview` - dealership/location rollups
- `GET /api/quality/verify` - quality verification findings

## Notes

- `server.js` remains available as a legacy SQLite fallback for local-only scenarios.
- If runtime target changes later, keep `package.json` scripts and this README in sync.
- Security defaults now include `helmet`, API rate limiting, and CORS origin allowlisting via `CORS_ORIGINS`.
- PostgreSQL runtime now exposes pool health at `GET /api/health/db`.
