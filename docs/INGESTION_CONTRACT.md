# SQL Ingestion Contract

Last updated: 2026-02-14

This contract defines the normalized payload expected by PostgreSQL ingestion paths.

## Scope

Applies to:
- `POST /api/inventory`
- `PUT /api/inventory/:id`
- scraper save path (`POST /api/scrape`, `POST /api/scrape/batch`) before persistence to `vehicles`

Source of truth:
- Validation + normalization in `db_pg.js`

## Create Payload (`POST /api/inventory`)

Required:
- `make` (string, non-empty)
- `model` (string, non-empty)
- `year` (integer, 1980..current_year+2)
- At least one identifier:
  - `vin` (17 alphanumeric chars), or
  - `stock_number` (string), or
  - `url` (string)

Optional (normalized when present):
- `trim`, `source`, `condition`, `title_status`, `description`
- `price` (positive number)
- `mileage` (integer)
- `exterior_color`, `interior_color`, `body_type`, `transmission`, `drivetrain`, `fuel_type`
- `engine`, `engine_cylinders`, `engine_displacement`, `horsepower`, `mpg_city`, `mpg_highway`
- `features` (array or JSON string array)
- `images` (array or JSON string array)
- `dealer_id`, `location_id`
- `quality_score` (0..100)
- `availability` (boolean)

Error behavior:
- 400 for validation failures (message from `ValidationError`)
- 409 for unique constraint violations

## Update Payload (`PUT /api/inventory/:id`)

Required:
- valid `:id` (positive integer)
- JSON object with at least one updatable field

Field constraints:
- `year` (1980..current_year+2) when provided
- `price` positive when provided
- `vin` must be valid 17-char format when provided

Error behavior:
- 400 validation failures
- 404 when row not found
- 409 unique conflicts

## Scraper Save Contract

Expected scraped car shape (minimum viable):
- preferably `vin`; fallback to `stock_number` and/or `url`
- `make`, `model`, `year` recommended for quality

Ingestion behavior:
- VIN present: upsert by `vin`
- VIN missing: match existing by `dealer_id + (url OR stock_number)`
- metrics returned for each save operation:
  - `inserted`
  - `updated`
  - `skipped`

## Uniqueness Strategy

Database constraints/indexing:
- Unique VIN (`vehicles.vin`)
- Unique non-VIN fallback key when present:
  - unique index on `(dealer_id, stock_number)` where `stock_number IS NOT NULL`

## Health Expectations

`GET /api/health/db` must return unhealthy (503) if required schema tables are missing:
- `vehicles`
- `dealers`
- `dealer_locations`

## Frontend Integration Notes

UI Create/Edit payloads should align to this contract to avoid 400s.
For progressive rollout, include explicit field-level validation messages in form workflows.
