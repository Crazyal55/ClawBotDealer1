# Dealer Dev Ops - Progress Update

Last updated: 2026-02-14

## Current State

Status: Active development. Core PostgreSQL runtime is functional with live inventory/dealership/quality routes, smoke health checks, and VPS deployment tooling.

Runtime target:
- Primary: `server_pg.js`
- Legacy fallback: `server.js` (SQLite)

## Implemented

Backend:
- Inventory CRUD in PostgreSQL runtime (`GET/POST/PUT/DELETE /api/inventory`).
- Scrape save endpoints return ingestion metrics (`inserted`, `updated`, `skipped`).
- Dealership overview endpoint (`GET /api/dealerships/overview`).
- Data quality endpoint (`GET /api/quality/verify`).
- DB health endpoint (`GET /api/health/db`) now checks required schema tables.
- Chat scaffold endpoints:
  - `GET /api/chat/sessions`
  - `POST /api/chat/sessions/:sessionKey/messages`

Database:
- PostgreSQL pooling and runtime DB checks in place.
- Ingestion uniqueness strategy includes VIN + `(dealer_id, stock_number)` when present.
- Seed schema includes chat tables (`chat_sessions`, `chat_messages`).
- Seed/index script updated to normalize duplicate stock numbers before unique index creation.

Frontend:
- Multi-page tab UX in `public/index.html`.
- Live loaders for Inventory, Quality, Dealership, and Database tabs.
- Database table supports field visibility control and row-level selection.
- Database tab wired to live CRUD actions (add/edit/delete via API).
- Chat tab includes simulator flow + backend scaffold call path.
- Visible inline status/error messages added for key tabs.
- Inline page script migrated to external `public/app.js`.
- Inline event attributes removed; UI now uses JS event listeners (CSP-compatible).
- No-op controls are explicitly disabled/labeled as \"Coming Soon\".

DevOps/CI:
- Smoke script defaults to `GET /api/health/db`.
- CI workflow includes smoke health check against DB health endpoint.
- Type-check step in CI is no longer `continue-on-error`.
- VPS docs/scripts exist for deploy, service, nginx, backups, and health monitoring.

## Verified Recently

Validated locally on 2026-02-14:
- `npm run type-check` passed.
- `npm run db:pg:init` passed (with local PostgreSQL at `summit_auto`).
- `npm run test:smoke` passed against `/api/health/db` on a non-conflicting port.

## Known Issues / Risks

1. UI contains multiple placeholder buttons with no handlers (looks broken to users).
- Example locations:
  - `public/index.html:923`
  - `public/index.html:999`
  - `public/index.html:1065`
  - `public/index.html:1112`
  - `public/index.html:1183`
  - `public/index.html:1235`
  - `public/index.html:1298`
  - `public/index.html:1322`

2. Security tradeoff currently active for UI compatibility.
- Mitigated: frontend was refactored to remove inline handlers/script and CSP can remain enabled.

3. Progress/documentation drift existed and must be maintained continuously.
- Previous progress doc had encoding corruption and outdated claims.

4. Local test environment may miss dev dependencies if `npm install` was not run.
- In one local run, integration tests could not execute because `jest` was not available in shell PATH.

## Recommended Next Steps

1. Convert UI from inline `onclick`/inline script to external JS event listeners.
- Then re-enable strict CSP in `helmet`.

2. Wire or disable placeholder buttons.
- If not implemented yet, mark as disabled with clear "Coming soon" labels.

3. Add backend integration coverage for new chat + health schema checks.
- Keep tests isolated from scraper work and DB side effects.

4. Keep docs synchronized with runtime reality.
- Update this file and README when endpoints/behavior change.

## References

- Runtime/API: `server_pg.js`
- DB layer: `db_pg.js`
- Seed schema: `docs/placeholder_data.sql`
- Frontend UI: `public/index.html`
- CI workflow: `.github/workflows/test.yml`
- Smoke check: `scripts/smoke-health.js`
- VPS deploy guide: `docs/VPS_DEPLOY.md`
