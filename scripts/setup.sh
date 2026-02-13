#!/bin/bash

# Setup script for Car Scraper Dev Ops Platform
# Initializes PostgreSQL with placeholder data

set -e

echo "🚗 Car Scraper R&D Tool - Setup"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed"
    echo "   Install with: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

echo "✅ PostgreSQL found"

# Database configuration
DB_NAME="summit_auto"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

echo ""
echo "📦 Creating database: $DB_NAME"

# Create database (drop if exists)
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" || {
    echo "❌ Failed to create database"
    exit 1
}

echo "✅ Database created: $DB_NAME"

# Create .env file for connection string
echo ""
echo "🔧 Creating .env file..."

cat > .env << EOF
DATABASE_URL=postgresql://$DB_USER:$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME
PORT=3000
NODE_ENV=development
EOF

echo "✅ .env file created"

# Check if placeholder_data.sql exists
if [ ! -f "placeholder_data.sql" ]; then
    echo "❌ placeholder_data.sql not found"
    exit 1
fi

echo ""
echo "📋 Loading placeholder data..."

# Load SQL data
sudo -u postgres psql -d $DB_NAME < placeholder_data.sql || {
    echo "❌ Failed to load placeholder data"
    exit 1
}

echo "✅ Placeholder data loaded"

# Verify data
VEHICLE_COUNT=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) as count FROM vehicles;")
DEALER_COUNT=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM dealers;")
LOCATION_COUNT=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM dealer_locations;")

echo ""
echo "🔍 Verifying data..."

echo "   Vehicles: $VEHICLE_COUNT"
echo "   Dealers: $DEALER_COUNT"
echo "   Locations: $LOCATION_COUNT"

if [ "$VEHICLE_COUNT" -eq 59 ] && [ "$DEALER_COUNT" -eq 1 ] && [ "$LOCATION_COUNT" -eq 3 ]; then
    echo "✅ All data verified!"
else
    echo "⚠️  Data count mismatch (expected: 59 vehicles, 1 dealer, 3 locations)"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "   1. Test => server: node server.js"
echo "   2. Open dashboard: http://localhost:3000"
echo "   3. Verify all vehicles are displayed"
echo "   4. Test filtering, sorting, and search"
echo "   5. Test export (Delete /api/inventory)"
echo ""
echo "To clean up and start fresh:"
echo "   sudo -u postgres psql -c 'DROP DATABASE $DB_NAME;'"
echo "   rm .env"
