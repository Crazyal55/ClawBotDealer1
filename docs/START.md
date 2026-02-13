# Car Scraper Dashboard - Quick Start

## Status: ✅ RUNNING

The dashboard is now running at: **http://localhost:3000**

## What You Got

A complete car scraping dev tool with:
- 🌐 Web dashboard (dark theme, clean UI)
- 📊 SQLite database (persistent storage)
- 🔧 Curl command parser (extracts URL & headers)
- 🚗 Smart car data extractor (VDP + SRP support)
- 📦 Maximal data extraction (VIN, specs, features, images, dealer info)
- 🔍 Search & filter
- 📤 CSV export

## How to Use

1. Open http://localhost:3000 in your browser
2. Find a car listing online (Cars.com, AutoTrader, dealer sites, etc.)
3. Open Chrome DevTools (F12) → Network tab
4. Refresh the page, find the listing request
5. Right-click → Copy → Copy as cURL
6. Paste into the dashboard
7. Add a source name (e.g., "Cars.com")
8. Click "Scrape & Add to Database"

## What Gets Extracted

### Core
- VIN (validated)
- Year, Make, Model, Trim
- Price, Mileage
- Stock Number

### Specs
- Body Type
- Transmission, Drivetrain
- Fuel Type, Engine
- HP, MPG (city/highway)

### Colors
- Exterior, Interior

### Features
- Full feature list
- Description
- Multiple images

### Dealer Info
- Name, Address, Phone
- Email (if available)

### Metadata
- Source name
- Original URL
- Scrape timestamp
- Raw HTML/JSON (for debugging)

## Database

The database is at: `car-scraper/cars.db`

You can query it directly:
```bash
sqlite3 car-scraper/cars.db
SELECT make, model, price, mileage FROM inventory;
```

## API Endpoints

- `GET /api/inventory` - Get all vehicles
- `POST /api/scrape` - Scrape from curl command
- `DELETE /api/inventory/:id` - Delete single vehicle
- `DELETE /api/inventory` - Clear all vehicles

## Stopping the Server

To stop the dashboard:
```bash
# Find and kill the process
ps aux | grep "node server.js"
kill <PID>
```

Or just press Ctrl+C if running in foreground.

## Next Steps

1. Test with a few different sources
2. Export to CSV and import into your main platform
3. Customize the schema if needed
4. Scale up for production use

---

Built by Jarvis 📺
