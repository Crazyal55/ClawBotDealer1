#!/bin/bash

# Morning Setup Script for Alex

echo "🌙 GOOD MORNING, ALEX!"
echo ""

# Check if server is running
if pgrep -f "node server" > /dev/null; then
    echo "✅ Server is already running at http://localhost:3000"
    echo ""
else
    echo "🚗 Starting server..."
    cd /home/alex/.openclaw/workspace/car-scraper
    nohup node server.js > server.log 2>&1 &
    echo "✅ Server started at http://localhost:3000"
    echo "   (Running in background. See server.log for output)"
    echo ""
fi

# Check if database has vehicles
if [ -f "cars.db" ]; then
    VEHICLE_COUNT=$(sqlite3 cars.db "SELECT COUNT(*) as count FROM inventory")
    echo "📊 Database has $VEHICLE_COUNT vehicles"
else
    echo "⚠️  No database found. Run: node load_placeholder_simple.js"
    echo ""
fi

echo "📋 Next Steps:"
echo "   1. Open: http://localhost:3000 (test dashboard with 59 vehicles)"
echo "   2. Read: MORNING_READINESS.md (complete overnight summary)"
echo "   3. Option: Make git commit (see MORNING_READINESS.md)"
echo "   4. Option: Connect your real scraper"
echo ""
echo "💡 Everything is ready! Let's build your car dealership SaaS."
