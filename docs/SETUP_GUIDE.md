# Setup Guide - PostgreSQL & SQLite

## Quick Start (Test Now with SQLite)

The current server (`server.js`) uses SQLite and is ready to run immediately:

```bash
cd /home/alex/.openclaw/workspace/car-scraper
node server.js
```

Open: http://localhost:3000

**This will work now** - no PostgreSQL needed.

---

## Setup for PostgreSQL (When Ready)

### Option 1: Install PostgreSQL Locally

```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start service
sudo service postgresql start

# Setup database (run this script)
cd /home/alex/.openclaw/workspace/car-scraper
sudo ./setup.sh
```

### Option 2: Use Docker (Recommended for Dev)

```bash
# Pull PostgreSQL image
docker pull postgres:15-alpine

# Run container
docker run -d \
  --name summit-auto-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=summit_auto \
  -p 5432:5432 \
  -v $PWD/data:/var/lib/postgresql/data \
  postgres:15-alpine

# Load placeholder data
docker exec -i summit-auto-db psql -U postgres -d summit_auto < placeholder_data.sql
```

### Option 3: Use Managed PostgreSQL (Production)

```bash
# Create database on Azure, AWS RDS, or managed PostgreSQL

# Update .env
DATABASE_URL=postgresql://user:password@host:port/summit_auto

# Load data
psql $DATABASE_URL < placeholder_data.sql
```

---

## Switching Between SQLite and PostgreSQL

### Using SQLite (Current - Works Now)
```bash
# Update package.json (already done)
npm install

# Start server
node server.js
```

### Using PostgreSQL (When Installed)
```bash
# Update package.json to use pg (already done)
npm install pg

# Create .env file
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/summit_auto" > .env

# Start server
node server_pg.js
```

---

## Testing the Setup

### Test 1: Database Connection
```bash
# With SQLite
node -e "const db = require('./db'); db.init().then(() => console.log('✅ SQLite connected'))"

# With PostgreSQL
node -e "const db = require('./db_pg'); db.init().catch(e => console.log('❌', e))"
```

### Test 2: API Health Check
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-13T..."
}
```

### Test 3: Load Inventory
```bash
curl http://localhost:3000/api/inventory | jq '. | length'
```

Expected: 0 vehicles (SQLite) or 59 vehicles (PostgreSQL with placeholder data)

---

## Verification Checklist

After setup, verify:

### Database
- [ ] Database created
- [ ] Tables exist (vehicles, dealers, dealer_locations)
- [ ] Indexes created
- [ ] Sample data loaded (59 vehicles)

### Server
- [ ] Server starts without errors
- [ ] API health check returns success
- [ ] Dashboard loads in browser
- [ ] No console errors

### Functionality
- [ ] Can view all inventory
- [ ] Can search/filter vehicles
- [ ] Can view vehicle details
- [ ] Can delete vehicles
- [ ] Can clear all
- [ ] Quality scores display correctly

---

## Troubleshooting

### PostgreSQL Connection Failed
```
Error: Connection refused
Fix: Check PostgreSQL is running
     sudo service postgresql status
     sudo service postgresql start
```

### Database Already Exists
```
Error: Database "summit_auto" already exists
Fix: Drop first or create with different name
     sudo -u postgres psql -c "DROP DATABASE summit_auto;"
```

### Permission Denied
```
Error: Permission denied for database
Fix: Run as postgres user
     sudo -u postgres psql
```

### Port Already in Use
```
Error: Address already in use
Fix: Kill existing server
     pkill -f "node server"
```

---

## Docker Compose Setup (Easy Dev Environment)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: summit-auto-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: summit_auto
    ports:
      - "5432:5432"
    volumes:
      - ./data:/var/lib/postgresql/data
      - ./placeholder_data.sql:/docker-entrypoint-initdb.d/setup.sql

  scraper:
    build: .
    container_name: car-scraper
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/summit_auto
      PORT: 3000
    ports:
      - "3000:3000"
    volumes:
      - ./:/app
```

Run with:
```bash
docker-compose up -d
```

---

## For Production (Azure)

### Create Azure PostgreSQL
1. Go to Azure Portal
2. Create PostgreSQL database
3. Get connection string
4. Update `.env`:
   ```
   DATABASE_URL=postgresql://user:password@server.postgres.database.azure.com:5432/summit_auto
   ```

### Load Data
```bash
psql $DATABASE_URL < placeholder_data.sql
```

### Deploy Server
```bash
# Build Docker image
docker build -t car-scraper .

# Push to Azure Container Registry
docker push registry.azurecr.io/car-scraper

# Deploy to Azure Web App or Container Instances
```

---

## Environment Variables

Required in `.env`:

```bash
# Database Connection
DATABASE_URL=postgresql://user:password@host:port/dbname

# Server Config
PORT=3000

# Environment
NODE_ENV=development  # or production
```

---

## Next Steps

Once PostgreSQL is set up:

1. ✅ Verify all 59 vehicles load correctly
2. ✅ Test filtering by location
3. ✅ Test sorting (price, year, quality)
4. ✅ Test search functionality
5. ✅ Test export (CSV/JSON)
6. ✅ Verify quality scores display
7. ✅ Test duplicate detection
8. ✅ Test dealer/location dropdowns

---

## Notes

- **SQLite**: Good for dev, single-user, low scale
- **PostgreSQL**: Production-ready, multi-user, high scale
- **Both work**: Same API endpoints, just different `db.js` vs `db_pg.js`

---

**Quick test:** Run `node server.js` (SQLite) or use Docker (PostgreSQL)
