# Car Dealership Scraper Platform

A comprehensive R&D platform for building car inventory databases with quality scoring, duplicate detection, and analytics dashboard.

## 🚀 Quick Start (Localhost Testing)

### Prerequisites
- Node.js v16 or higher
- npm (comes with Node.js)

### Setup & Run (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in browser
# Navigate to: http://localhost:3000
```

That's it! The dashboard will load with 59 sample vehicles already in the database.

---

## 📁 Project Structure

```
dealership-platform/
├── docs/                  # Documentation
│   ├── OVERNIGHT_SUMMARY_FINAL.md
│   ├── HYBRID_DB_ARCHITECTURE.md
│   ├── TASK_SCHEDULE.md
│   └── ...
├── scripts/               # Utility scripts
│   ├── setup.sh           # Initial setup
│   ├── morning_setup.sh   # Daily setup
│   ├── generate_fake_data.js
│   └── load_placeholder_data.js
├── public/                # Web assets
│   └── index.html        # Dashboard UI
├── src/                   # Core application files (root)
│   ├── server.js         # Main server
│   ├── server_v2.js      # Enhanced server
│   ├── server_pg.js      # PostgreSQL version
│   ├── scraper.js        # Web scraper
│   ├── db.js            # SQLite database
│   ├── db_v2.js         # Enhanced SQLite
│   └── db_pg.js         # PostgreSQL adapter
├── cars.db               # SQLite database (auto-created)
└── package.json          # Dependencies
```

---

## 🎯 Features

### Data Quality System
- **Quality Scoring (0-100%)**: Validates completeness and accuracy
- **Duplicate Detection**: VIN-based deduplication
- **Error Flags**: Invalid VINs, unusual prices, missing data
- **Warning Flags**: Review needed for incomplete records

### Scraping Capabilities
- **Curl Command Input**: Paste from browser DevTools
- **Smart Parsing**: Detects single car pages vs search results
- **JSON-LD Support**: Extracts structured data when available
- **Maximal Extraction**: VIN, specs, features, images, dealer info

### Dashboard & Analytics
- **Inventory View**: Search, filter, sort vehicles
- **Quality Dashboard**: See data quality distribution
- **Statistics**: Total vehicles, average price, quality metrics
- **CSV Export**: Export filtered results

### Advanced Features
- **Batch Processing**: Scrape multiple URLs concurrently
- **Advanced Filtering**: By price, year, quality, location
- **Multi-location Support**: Track vehicles by dealership
- **PostgreSQL Ready**: Production-ready version included

---

## 🧪 Testing Locally

### Test 1: View Sample Data
1. Start server: `npm start`
2. Open http://localhost:3000
3. You should see 59 sample vehicles
4. Click any vehicle to view details
5. Use search/filter to test filtering

### Test 2: Quality Scoring
1. On dashboard, scroll to "Quality Distribution"
2. Verify bar chart shows quality spread
3. Click "Show Quality Issues" to see flagged vehicles

### Test 3: Scrape a Car
1. Open Chrome DevTools (F12) on any car listing
2. Right-click request → Copy → Copy as cURL
3. Paste into dashboard scrape box
4. Add source name (e.g., "Cars.com")
5. Click "Scrape & Add"
6. Verify new car appears in inventory

### Test 4: API Endpoints
```bash
# Get all vehicles
curl http://localhost:3000/api/inventory

# Get statistics
curl http://localhost:3000/api/stats

# Search by make
curl "http://localhost:3000/api/inventory?make=Toyota"

# Filter by price range
curl "http://localhost:3000/api/inventory?minPrice=10000&maxPrice=30000"
```

### Test 5: Reset Database
```bash
# Stop server (Ctrl+C)
# Delete database
rm cars.db
# Start server again (will recreate with sample data)
npm start
```

---

## 📚 Documentation

### Core Documentation
- **[OVERNIGHT_SUMMARY_FINAL.md](docs/OVERNIGHT_SUMMARY_FINAL.md)** - Complete feature list
- **[HYBRID_DB_ARCHITECTURE.md](docs/HYBRID_DB_ARCHITECTURE.md)** - Database design for RAG
- **[TASK_SCHEDULE.md](docs/TASK_SCHEDULE.md)** - 8-week development roadmap

### Setup Guides
- **[SETUP_GUIDE.md](docs/SETUP_GUIDE.md)** - Detailed setup instructions
- **[SETUP_README.md](docs/SETUP_README.md)** - Quick setup reference
- **[QUICK_START.md](docs/QUICK_START.md)** - 5-minute quick start

### Features & Development
- **[ALL_NIGHT_FEATURES.md](docs/ALL_NIGHT_FEATURES.md)** - Feature breakdown
- **[FEATURE_BACKLOG.md](docs/FEATURE_BACKLOG.md)** - Planned features
- **[POLISH_WISHLIST.md](docs/POLISH_WISHLIST.md)** - UI/UX improvements

### Data & Testing
- **[PLACEHOLDER_DATA_README.md](docs/PLACEHOLDER_DATA_README.md)** - Sample data explanation
- **[TESTING.md](docs/TESTING.md)** - Testing procedures

---

## 🛠️ Common Tasks

### Reset to Sample Data
```bash
# Delete existing database
rm cars.db

# Run data loader
node scripts/load_placeholder_data.js

# Start server
npm start
```

### Generate Fake Data
```bash
# Generate 100 random vehicles
node scripts/generate_fake_data.js
```

### Run Tests
```bash
# Run test suite
node test.js
```

### Check Database
```bash
# View database contents
sqlite3 cars.db "SELECT COUNT(*) FROM vehicles;"

# View quality distribution
sqlite3 cars.db "SELECT quality_score, COUNT(*) FROM vehicles GROUP BY quality_score;"
```

### Use PostgreSQL Version
```bash
# Set up PostgreSQL first
# Then run:
node server_pg.js
```

---

## 📊 Database Schema

### Main Table: `vehicles`
```sql
CREATE TABLE vehicles (
  id INTEGER PRIMARY KEY,
  vin TEXT UNIQUE,
  year INTEGER,
  make TEXT,
  model TEXT,
  trim TEXT,
  price REAL,
  mileage INTEGER,
  stock_number TEXT,
  body_type TEXT,
  transmission TEXT,
  drivetrain TEXT,
  fuel_type TEXT,
  exterior_color TEXT,
  interior_color TEXT,
  features TEXT,           -- JSON array
  images TEXT,              -- JSON array
  description TEXT,
  dealer_name TEXT,
  dealer_location TEXT,
  source TEXT,
  url TEXT,
  quality_score INTEGER,     -- 0-100
  quality_flags TEXT,        -- JSON array
  scraped_at TIMESTAMP
);
```

---

## 🚦 API Reference

### Inventory Endpoints
- `GET /api/inventory` - Get all vehicles
- `GET /api/inventory/:id` - Get single vehicle
- `POST /api/inventory` - Add vehicle
- `DELETE /api/inventory/:id` - Delete vehicle

### Filter Parameters
```
?make=Toyota
?minPrice=10000&maxPrice=30000
?minYear=2015&maxYear=2023
?minQuality=80
?source=Cars.com
```

### Scraping Endpoints
- `POST /api/scrape` - Scrape from curl command
- `POST /api/scrape/batch` - Scrape multiple URLs

### Analytics Endpoints
- `GET /api/stats` - Get statistics
- `GET /api/quality/distribution` - Quality scores
- `GET /api/quality/issues` - Flagged vehicles

---

## 🔄 Development Workflow

### Adding New Features
1. Update `server.js` or create new module
2. Add tests to `test.js`
3. Update documentation in `docs/`
4. Run tests locally
5. Commit changes

### Database Changes
1. Create migration script in `scripts/`
2. Update schema in `docs/HYBRID_DB_ARCHITECTURE.md`
3. Test with SQLite version
4. Verify PostgreSQL version

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>
```

### Database locked
```bash
# Delete database and restart
rm cars.db
npm start
```

### Dependencies missing
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Notes

- Default port: **3000**
- Database: **SQLite** (`cars.db`)
- PostgreSQL version: Available (`server_pg.js`)
- Sample data: **59 vehicles** auto-loaded

---

## 🚀 Next Steps

1. **Test on localhost** - Follow testing steps above
2. **Review documentation** - Check `docs/TASK_SCHEDULE.md`
3. **Customize for your needs** - Adjust quality scoring rules
4. **Deploy to production** - Use PostgreSQL version
5. **Integrate with RAG** - See `HYBRID_DB_ARCHITECTURE.md`

---

**Built for the AI Dealership Platform - Simple Intelligence.**
