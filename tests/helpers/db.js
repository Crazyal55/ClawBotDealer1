/**
 * Database helper utilities for testing
 * Provides helpers for test database setup and cleanup
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Create and initialize test database
 * @param {string} connectionString - PostgreSQL connection string
 */
async function createTestDatabase(connectionString = 'postgresql://postgres:postgres@localhost:5432/postgres') {
  const pool = new Pool({ connectionString });

  try {
    // Drop test database if it exists
    await pool.query('DROP DATABASE IF EXISTS clawbot_test');
    console.log('✓ Dropped existing test database');

    // Create test database
    await pool.query('CREATE DATABASE clawbot_test');
    console.log('✓ Created test database: clawbot_test');

    await pool.end();
  } catch (error) {
    console.error('✗ Failed to create test database:', error.message);
    await pool.end();
    throw error;
  }
}

/**
 * Run database migrations on test database
 * @param {string} connectionString - PostgreSQL connection string (to clawbot_test)
 */
async function migrateTestDatabase(connectionString = 'postgresql://postgres:postgres@localhost:5432/clawbot_test') {
  const pool = new Pool({ connectionString });

  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dealers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        website TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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

      CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
      CREATE INDEX IF NOT EXISTS idx_vehicles_make ON vehicles(make);
      CREATE INDEX IF NOT EXISTS idx_vehicles_dealer ON vehicles(dealer_id);
      CREATE INDEX IF NOT EXISTS idx_vehicles_source ON vehicles(source);
    `);

    console.log('✓ Created test tables');

    // Insert test dealer
    await pool.query(`
      INSERT INTO dealers (id, name, website)
      VALUES (1, 'Test Dealer', 'https://test.com')
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('✓ Inserted test dealer');

    await pool.end();
  } catch (error) {
    console.error('✗ Failed to migrate test database:', error.message);
    await pool.end();
    throw error;
  }
}

/**
 * Clean all test data from tables
 * @param {string} connectionString - PostgreSQL connection string
 */
async function cleanTestData(connectionString = 'postgresql://postgres:postgres@localhost:5432/clawbot_test') {
  const pool = new Pool({ connectionString });

  try {
    await pool.query('TRUNCATE vehicles, dealer_locations, dealers CASCADE');
    // Re-insert test dealer
    await pool.query(`
      INSERT INTO dealers (id, name, website)
      VALUES (1, 'Test Dealer', 'https://test.com')
    `);
    await pool.end();
  } catch (error) {
    console.error('✗ Failed to clean test data:', error.message);
    await pool.end();
    throw error;
  }
}

/**
 * Drop test database
 * @param {string} connectionString - PostgreSQL connection string (to postgres)
 */
async function dropTestDatabase(connectionString = 'postgresql://postgres:postgres@localhost:5432/postgres') {
  const pool = new Pool({ connectionString });

  try {
    await pool.query('DROP DATABASE IF EXISTS clawbot_test');
    console.log('✓ Dropped test database');
    await pool.end();
  } catch (error) {
    console.error('✗ Failed to drop test database:', error.message);
    await pool.end();
    throw error;
  }
}

/**
 * Insert test vehicle data
 * @param {Array} vehicles - Array of vehicle objects
 * @param {string} connectionString - PostgreSQL connection string
 */
async function insertTestVehicles(vehicles, connectionString = 'postgresql://postgres:postgres@localhost:5432/clawbot_test') {
  const pool = new Pool({ connectionString });

  try {
    for (const vehicle of vehicles) {
      await pool.query(`
        INSERT INTO vehicles (
          vin, year, make, model, trim, price, mileage,
          exterior_color, interior_color, body_type, transmission,
          drivetrain, fuel_type, engine, url, dealer_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15, 1
        )
      `, [
        vehicle.vin || null,
        vehicle.year || null,
        vehicle.make || null,
        vehicle.model || null,
        vehicle.trim || null,
        vehicle.price || null,
        vehicle.mileage || null,
        vehicle.exterior_color || null,
        vehicle.interior_color || null,
        vehicle.body_type || null,
        vehicle.transmission || null,
        vehicle.drivetrain || null,
        vehicle.fuel_type || null,
        vehicle.engine || null,
        vehicle.url || null
      ]);
    }

    await pool.end();
  } catch (error) {
    console.error('✗ Failed to insert test vehicles:', error.message);
    await pool.end();
    throw error;
  }
}

/**
 * Get test pool connection
 * @param {string} connectionString - PostgreSQL connection string
 */
function getTestPool(connectionString = 'postgresql://postgres:postgres@localhost:5432/clawbot_test') {
  return new Pool({
    connectionString,
    max: 5
  });
}

module.exports = {
  createTestDatabase,
  migrateTestDatabase,
  cleanTestData,
  dropTestDatabase,
  insertTestVehicles,
  getTestPool
};
