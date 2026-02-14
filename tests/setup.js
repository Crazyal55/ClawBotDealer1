/**
 * Global test setup
 * Runs once before all test suites
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Use test database (defaults to local test DB)
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/clawbot_test';

// Suppress console.log during tests (can be overridden per test)
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(async () => {
  console.log('\n🧪 Setting up test environment...\n');

  // Create test fixtures directory if it doesn't exist
  const fixturesDir = path.join(__dirname, 'fixtures');
  const htmlDir = path.join(fixturesDir, 'html');
  const jsonDir = path.join(fixturesDir, 'json');

  [htmlDir, jsonDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Setup test database connection
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5  // Limit connections during tests
    });

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✓ Test database connected');

    // Create test tables if they don't exist
    await createTestTables(pool);
    console.log('✓ Test tables ready');

    // Make pool available globally for tests
    global.testPool = pool;

  } catch (error) {
    console.error('✗ Test database setup failed:', error.message);
    console.log('\n⚠️  Skipping database-dependent tests\n');
    global.testPool = null;
  }
});

/**
 * Create test database tables
 */
async function createTestTables(pool) {
  await pool.query(`
    -- Dealers table
    CREATE TABLE IF NOT EXISTS dealers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      website TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Dealer locations table
    CREATE TABLE IF NOT EXISTS dealer_locations (
      id SERIAL PRIMARY KEY,
      dealer_id INTEGER REFERENCES dealers(id) ON DELETE CASCADE,
      name TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      phone TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Vehicles table
    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      source TEXT,
      vin TEXT UNIQUE,
      year INTEGER,
      make TEXT,
      model TEXT,
      trim TEXT,
      price NUMERIC(10, 2),
      mileage INTEGER,
      exterior_color TEXT,
      interior_color TEXT,
      body_type TEXT,
      transmission TEXT,
      drivetrain TEXT,
      fuel_type TEXT,
      engine TEXT,
      engine_cylinders TEXT,
      engine_displacement TEXT,
      horsepower INTEGER,
      mpg_city INTEGER,
      mpg_highway INTEGER,
      features JSONB,
      description TEXT,
      images JSONB,
      dealer_id INTEGER REFERENCES dealers(id) ON DELETE SET NULL,
      location_id INTEGER REFERENCES dealer_locations(id) ON DELETE SET NULL,
      condition TEXT,
      title_status TEXT,
      stock_number TEXT,
      url TEXT,
      quality_score INTEGER DEFAULT 0,
      availability BOOLEAN DEFAULT true,
      scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Add indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
    CREATE INDEX IF NOT EXISTS idx_vehicles_make ON vehicles(make);
    CREATE INDEX IF NOT EXISTS idx_vehicles_dealer ON vehicles(dealer_id);
    CREATE INDEX IF NOT EXISTS idx_vehicles_source ON vehicles(source);
  `);
}

// Export console methods for tests that need them
global.originalConsole = {
  log: originalConsoleLog,
  error: originalConsoleError,
  warn: originalConsoleWarn
};

// Restore console for debugging (set to true in individual tests if needed)
global.restoreConsole = () => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
};
