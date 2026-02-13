# Dealer Dev Ops - Progress Update

## Changes Made

### Runtime and Stability
- Set active runtime to `server.js` (JS + SQLite).
- Fixed startup scripts and dependency gaps in `package.json`.
- Added real type checking (`npm run type-check`) and smoke gate (`npm run test:smoke`).
- Added CI shortcut script: `npm run ci`.

### PostgreSQL / SQL-First Setup
- Added PostgreSQL bootstrap script: `scripts/init-postgres.js`.
- Added scripts:
  - `npm run db:pg:init`
  - `npm run start:pg`
- Fixed PostgreSQL seed/schema script compatibility in `docs/placeholder_data.sql` (moved index definitions to `CREATE INDEX` statements).

### Frontend Navigation and Pages
- Rebranded UI to **Dealer Dev Ops**.
- Converted key sidebar items into separate pages:
  - Dashboard
  - Scraper
  - Inventory
  - Quality
  - Database
  - Settings
- Removed global top search bar and moved search to data-specific contexts.

### Scraper Page
- Added dedicated scraper page controls:
  - Source Name
  - Target URL
  - Curl Command
  - Scrape/Test/Batch actions (static placeholders)
- Added URL preview feature:
  - Auto-extract URL from curl
  - Preview status text
  - Embedded preview frame
  - Open-in-new-tab link

### Database Page
- Added richer static sample table content.
- Added field selector (column toggle) controls.
- Added extra selectable fields including:
  - Powertrain (FWD/RWD/AWD/4WD)
  - Transmission
  - Fuel
  - Mileage
  - Exterior Color
  - Stock #
  - Source
  - Customer (new field)
- Added table scroll behavior:
  - Horizontal scrolling for wide columns
  - Vertical scrolling with sticky table headers

## Current Progress

- App boots and passes local smoke checks.
- Type-check gate is active and passing.
- UI now supports static-sample-first development while scraper logic is being finalized.
- SQL-first + hybrid direction is scaffolded:
  - Relational side is set up.
  - Vector/embedding layer is not implemented yet.

## Current Limitations

- Inventory/Quality/Database pages still use static sample rows (intentional for current phase).
- Scraper buttons are UI placeholders in the new page layout (not yet wired to all backend actions in-page).
- URL preview may be blocked by site iframe policies for some domains.

## Next Steps

1. Finish scraper logic end-to-end
- Validate curl parsing across more real dealer sources.
- Add robust error handling and source-specific parsing fallbacks.
- Wire scraper page buttons to backend endpoints with clear run logs.

2. Complete SQL ingestion workflow
- Finalize mapping from scraped fields -> SQL schema.
- Add upsert/dedupe rules (VIN + source fallback keys).
- Add validation and quality-flag generation during ingestion.

3. Move static pages to live data (when scraper is stable)
- Wire Inventory tab to `/api/inventory`.
- Wire Quality tab to quality endpoints/stats.
- Wire Database tab to schema/query endpoints and keep field selector behavior.

4. Start hybrid vector layer (after SQL is stable)
- Add embeddings table/index strategy (pgvector or external vector DB).
- Build SQL filter + semantic rerank pipeline.
- Add sync jobs for new/updated/deleted vehicles.

5. Add delivery safeguards
- Add basic frontend regression checks for tab routing and table controls.
- Add backend integration tests for scrape -> save -> query flow.
