# Car Dealership Scraper Platform

A comprehensive R&D platform for building AI-powered car inventory systems with quality scoring, vector embeddings, and semantic search capabilities.

## 🚀 Quick Start (Localhost Testing)

### Prerequisites
- Node.js v16 or higher
- npm (comes with Node.js)

### Setup & Run (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Start server
npm start

# 3. Open in browser
# Navigate to: http://localhost:3000
```

That's it! The dashboard will load with 59 sample vehicles already in database.

---

## 📁 Project Structure

```
dealership-platform/
├── src/                      # Core application files
│   ├── server/               # Server components
│   │   └── index.js         # Main server entry
│   ├── scraper/              # Web scraping modules
│   │   └── index.js         # Main scraper
│   ├── database/             # Database adapters
│   │   ├── sqlite.js        # SQLite adapter
│   │   ├── postgres.js       # PostgreSQL adapter
│   │   └── models/          # Data models
│   ├── services/             # Business logic
│   │   ├── quality.js       # Quality scoring
│   │   ├── validation.js     # Data validation
│   │   └── dedup.js        # Duplicate detection
│   └── utils/               # Utility functions
├── public/                   # Web assets
│   ├── index.html            # Main dashboard
│   ├── css/
│   │   └── style.css        # Styles
│   └── js/
│       └── app.js           # Frontend logic
├── scripts/                  # Utility scripts
│   ├── setup.sh              # Initial setup
│   ├── generate-data.js      # Generate fake data
│   └── load-data.js         # Load placeholder data
├── tests/                    # Test files
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests
├── docs/                     # Documentation
│   ├── README.md             # Documentation index
│   ├── TESTING.md            # Testing procedures
│   ├── HYBRID_DB_ARCHITECTURE.md  # Database design
│   └── ...                  # Additional docs
├── config/                   # Config files
│   ├── default.json         # Default config
│   ├── development.json     # Development config
│   └── production.json      # Production config
├── cars.db                   # SQLite database (auto-created)
├── .gitignore
├── package.json
└── README.md                 # This file
```

---

## 📊 Dashboard Layout

### Navigation Structure

```
┌────────┬─────────────────────────────────────────┐
│        │  AI Dealership Platform               │
│        ├─────────────────────────────────────────┤
│        │  Env: ▼Dev  Search...  + New Source  │
│ Side   ├─────────────────────────────────────────┤
│ bar    │                                         │
│        │  [Import Mock Data]                    │
│        ├─────────────────────────────────────────┤
│ Scraper│                                         │
│ Inventory                                       │
│ Database                                        │
│ Quality                                        │
│ Embeddings ⚡                                │
│ Vector DB ⚡                                  │
│ Semantic Viz ⚡                               │
│ Customers ⚡                                 │
│ Analytics ⚡                                  │
│ Settings                                       │
│        │                                         │
└────────┴─────────────────────────────────────────┘
```

### Sidebar Sections

#### Active Tabs (Phase 1 - Built)
- **Scraper** - Paste curl commands, scrape cars, batch processing
- **Inventory** - View/filtered vehicle table, export, bulk actions
- **Database** - DB schema viewer, raw SQL queries, data exports
- **Quality** - Quality scoring distribution, flagged vehicles, issue tracking

#### Roadmap Tabs (Phase 2 & 3 - Coming Soon)
- **Embeddings** ⚡ - Vector embedding status, model testing, batch embedding
- **Vector DB** ⚡ - Qdrant/Pinecone connection, index management, similarity search
- **Semantic Viz** ⚡ - 2D/3D vector visualization, cluster analysis, similarity demo
- **Customers** ⚡ - User accounts, session analytics, usage metrics
- **Analytics** ⚡ - Platform metrics, scrape statistics, performance tracking
- **Settings** - Configuration, API keys, environment management

---

## 🎯 Features by Tab

### Scraper Tab
- Large textarea for curl command input
- Source name input field
- Scrape history with timestamps
- Batch URL processing
- Status indicators (Success/Failed/Running)
- Scraping metrics (time, cars found, quality)

### Inventory Tab
- Vehicle data table with sorting
- Filter sidebar (make, price, year, quality)
- Search functionality
- Bulk actions (export CSV/JSON, delete all)
- Vehicle detail modal
- Quality score badges

### Database Tab
- Interactive schema viewer
- Raw SQL query editor
- Query results table
- Export options (CSV, JSON, SQL)
- Database statistics
- Table relationships diagram

### Quality Tab
- Quality score distribution chart
- Flagged vehicles list
- Quality issue breakdown
- Recalculate quality button
- Quality trend over time
- Export quality report

### Embeddings Tab (Phase 2)
- Embedding model selection
- Test embedding area
- Batch embedding progress
- Vector dimension stats
- Model performance metrics
- Embedding history

### Vector DB Tab (Phase 2)
- Connection status monitor
- Index/collection list
- Collection viewer
- Similarity search interface
- Vector CRUD operations
- Index optimization tools

### Semantic Viz Tab (Phase 2)
- 2D/3D vector space visualization
- Cluster labeling
- Similarity search demo
- Export visualization data
- Custom query visualization
- Real-time embedding viz

### Customers Tab (Phase 3)
- User account management
- Session analytics
- Usage statistics
- Account permissions
- Activity logs
- Bulk user actions

### Analytics Tab (Phase 3)
- Platform-wide metrics
- Scraping performance
- Quality trends
- User engagement
- System health
- Export analytics data

### Settings Tab (Phase 3)
- Environment configuration
- API key management
- Model settings
- Scraping limits
- Notification preferences
- Theme selection

---

## 🎨 Design System

### Visual Style
- **Theme**: Dark charcoal (#1a1a2e background)
- **Accent**: Electric teal (#00d4ff) for primary actions
- **Secondary**: Muted grays for non-interactive elements
- **Elevation**: Subtle card borders and shadows
- **Corners**: 16-20px rounded corners

### Typography
- **Font**: Inter (Google Fonts)
- **KPI Numbers**: 28-36px, bold
- **Labels**: 12-14px, uppercase or muted
- **Body Text**: 14-16px, regular weight
- **Headings**: 18-24px, semibold

### Components
- **Buttons**: Filled primary, outlined secondary
- **Cards**: Subtle hover effects, clean borders
- **Badges**: Status pills with color coding
- **Inputs**: Focus glow effect, clean borders
- **Tables**: Sorting, filtering, row hover states

### Color Palette
```css
/* Backgrounds */
--bg-primary: #1a1a2e;
--bg-secondary: #16213e;
--bg-card: #1f293a;

/* Text */
--text-primary: #f8fafc;
--text-secondary: #94a3b8;
--text-muted: #64748b;

/* Accents */
--accent-primary: #00d4ff;
--accent-success: #10b981;
--accent-warning: #f59e0b;
--accent-error: #ef4444;

/* Borders */
--border-subtle: #334155;
--border-active: #475569;
```

---

## 🧪 Testing Locally

### Test 1: View Dashboard & Navigation
1. Start server: `npm start`
2. Open http://localhost:3000
3. Navigate through sidebar tabs
4. Verify all built tabs work

### Test 2: Quality Scoring
1. Click "Quality" tab
2. Review quality distribution
3. Check flagged vehicles
4. Verify quality calculations

### Test 3: Scraping
1. Click "Scraper" tab
2. Get curl command from car listing
3. Paste into scrape input
4. Click "Scrape & Add"
5. Verify new car appears in inventory

### Test 4: Database Queries
1. Click "Database" tab
2. Run raw SQL query
3. View results table
4. Export results

### Test 5: Import Mock Data
1. Click "Import Mock Data" button
2. Select data size (Small/Medium/Large)
3. Verify data loads correctly
4. Check quality scores

---

## 📚 Documentation

### Core Documentation
- **[Documentation Index](docs/README.md)** - All docs overview
- **[TESTING.md](docs/TESTING.md)** - Comprehensive testing procedures
- **[HYBRID_DB_ARCHITECTURE.md](docs/HYBRID_DB_ARCHITECTURE.md)** - Database design for RAG

### Setup & Development
- **[SETUP_GUIDE.md](docs/SETUP_GUIDE.md)** - Detailed setup instructions
- **[TASK_SCHEDULE.md](docs/TASK_SCHEDULE.md)** - 8-week development roadmap

### Features & Roadmap
- **[OVERNIGHT_SUMMARY_FINAL.md](docs/OVERNIGHT_SUMMARY_FINAL.md)** - Complete feature list
- **[FEATURE_BACKLOG.md](docs/FEATURE_BACKLOG.md)** - Planned features

---

## 🛠️ Common Tasks

### Reset to Sample Data
```bash
# Delete existing database
rm cars.db

# Load sample data
node scripts/load-data.js

# Start server
npm start
```

### Generate Fake Data
```bash
# Generate 100 random vehicles
node scripts/generate-data.js 100

# Generate 500 vehicles
node scripts/generate-data.js 500
```

### Run Tests
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

### Check Database
```bash
# View database contents
sqlite3 cars.db "SELECT COUNT(*) FROM vehicles;"

# View quality distribution
sqlite3 cars.db "SELECT quality_score, COUNT(*) FROM vehicles GROUP BY quality_score;"
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
- `GET /api/scrape/history` - Get scrape history

### Analytics Endpoints
- `GET /api/stats` - Get statistics
- `GET /api/quality/distribution` - Quality scores
- `GET /api/quality/issues` - Flagged vehicles

### Database Endpoints
- `GET /api/database/schema` - Get schema
- `POST /api/database/query` - Run SQL query
- `GET /api/database/tables` - List tables

---

## 🔄 Development Phases

### Phase 1 (Current) - Foundation
- ✅ Scraper functionality
- ✅ Inventory management
- ✅ Database viewer
- ✅ Quality scoring system

### Phase 2 (Next) - AI Features
- 🔲 Vector embeddings
- 🔲 Vector DB integration
- 🔲 Semantic visualization
- 🔲 Similarity search

### Phase 3 (Later) - Platform
- 🔲 Customer management
- 🔲 Advanced analytics
- 🔲 Multi-user support
- 🔲 Production deployment

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>

# Restart server
npm start
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
- PostgreSQL version: Available for Phase 2
- Sample data: **59 vehicles** auto-loaded
- Design system: **Dark theme with teal accents**

---

## 🚀 Next Steps

1. **Test on localhost** - Follow testing procedures above
2. **Review documentation** - Check `docs/TASK_SCHEDULE.md`
3. **Customize for needs** - Adjust quality scoring rules
4. **Plan Phase 2** - Review embedding and vector DB integration

---

## 🤝 Contributing

When adding new features:
1. Create feature branch
2. Implement feature with tests
3. Update documentation
4. Submit pull request

---

**Built for AI Dealership Platform - Simple Intelligence.**

Phase 1: Foundation | Phase 2: AI Features | Phase 3: Platform
