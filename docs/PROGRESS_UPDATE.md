# Dealer Dev Ops - Progress Update

## References

- Azure cloud runbook: `docs/AZURE_SETUP.md`
- Project overview/run commands: `README.md`

## Current Implemented State

### Runtime and Build Stability
- Active default runtime is `server.js` (JS + SQLite).
- PostgreSQL runtime path exists via `server_pg.js`.
- CI-style local gate is active:
  - `npm run type-check`
  - `npm run test:smoke`
  - `npm run ci`

### SQL-First and Ingestion
- PostgreSQL bootstrap is in place:
  - `npm run db:pg:init`
  - `npm run start:pg`
- SQL schema script fixed and indexed in `docs/placeholder_data.sql`.
- Ingestion hardening in `db_pg.js`:
  - VIN upsert path
  - non-VIN fallback matching
  - validation helpers and normalization
  - ingestion metrics returned: `inserted`, `updated`, `skipped`
- API hardening in `server_pg.js`:
  - explicit 400 validation handling
  - scrape responses now include ingestion metrics
  - unique conflict handling (409)

### API Surface Added/Expanded
- `POST /api/inventory` (create)
- `PUT /api/inventory/:id` (update)
- `GET /api/dealerships/overview` (business/location rollups)
- `GET /api/quality/verify` (data quality checks)
- `GET /api/inventory` supports filters (`dealerId`, `locationId`, `make`, `model`, `drivetrain`, `minPrice`, `maxPrice`)

### UI and Navigation
- Sidebar pages are separated:
  - Dashboard
  - Scraper
  - Inventory
  - Quality
  - Database
  - Dealerships
  - Chatbot
  - Settings
- Database page:
  - wide table with horizontal/vertical scroll
  - sticky header
  - selectable columns (including powertrain/customer)
- Dealership page:
  - live backend integration to `/api/dealerships/overview`
  - business/location filters
  - sort by vehicle count, quality, price
- Chatbot:
  - dedicated tab
  - static chat simulator
  - Settings includes chatbot dashboard and setup wizard sections

## Current Limitations

- Inventory/Quality/Database still use mostly static sample rendering (live wiring partial/in-progress).
- Scraper page controls are mostly static UI (core scraper logic is being finalized separately).
- Chatbot is simulator-only; no live model endpoint wired yet.
- Vector/embedding storage and hybrid semantic retrieval are not implemented yet.

## Azure-Ready Work Completed (No Live Azure Required)

- Added Azure deployment runbook with concrete steps:
  - `docs/AZURE_SETUP.md`
- App/config prepared for cloud-style env-based setup:
  - `DATABASE_URL` driven
  - PostgreSQL init path scripted
- Multi-business/location data model and API support implemented for cloud scaling path.

## Proposed Next Steps (No Live Azure Required)

1. Finish frontend live data wiring to existing SQL APIs
- Inventory page -> `/api/inventory`
- Quality page -> `/api/quality/verify`
- Database page -> live row feed + edit/update/delete hooks

2. Complete scraper-to-ingestion UI wiring
- Wire Scraper buttons to backend endpoints
- Show scrape run logs + ingestion metrics inline

3. Add backend tests for ingestion guarantees
- VIN upsert
- non-VIN fallback behavior
- validation 400 responses
- scrape metric response shape

4. Prepare Azure deploy automation artifacts
- Add GitHub Actions workflow for build + deploy targets (staging/prod)
- Add env templates for App Service settings/Key Vault references

5. Start hybrid search scaffolding (still local/dev)
- Create embedding schema/table scaffold
- define retrieval contract (SQL filter first, semantic rerank second)
