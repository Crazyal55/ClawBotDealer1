const { Pool } = require('pg');

class CarDatabase {
  constructor() {
    // PostgreSQL connection
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/summit_auto',
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async init() {
    try {
      // Check if tables exist
      const result = await this.pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      const tables = result.rows.map(r => r.table_name);
      
      console.log('Existing tables:', tables);

      if (tables.includes('vehicles') && tables.includes('dealers') && tables.includes('dealer_locations')) {
        console.log('Database already initialized');
        return;
      }

      console.log('Database not initialized, run placeholder_data.sql first');
      throw new Error('Please run placeholder_data.sql to initialize database');
    } catch (error) {
      console.error('Database check error:', error);
      throw error;
    }
  }

  async saveInventory(scrapeResult) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const saved = [];

      for (const car of scrapeResult.cars) {
        // Check if VIN already exists
        const existingCheck = await client.query(
          'SELECT id FROM vehicles WHERE vin = $1',
          [car.vin || null]
        );

        if (existingCheck.rows.length > 0) {
          console.log(`Skipping duplicate VIN: ${car.vin}`);
          continue;
        }

        const result = await client.query(`
          INSERT INTO vehicles (
            source, vin, year, make, model, trim, price, mileage,
            exterior_color, interior_color, body_type, transmission,
            drivetrain, fuel_type, engine, engine_cylinders, engine_displacement,
            horsepower, mpg_city, mpg_highway, features, description,
            images, dealer_id, location_id, condition, title_status, 
            url, quality_score, availability
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19,
            $20, $21, $22, $23, $24, $25, $26, $27,
            $28, $29, $30, $31, $32
          )
          RETURNING id
        `, [
          scrapeResult.source || 'unknown',
          car.vin || null,
          car.year || null,
          car.make || null,
          car.model || null,
          car.trim || null,
          car.price || null,
          car.mileage || null,
          car.exterior_color || null,
          car.interior_color || null,
          car.body_type || null,
          car.transmission || null,
          car.drivetrain || null,
          car.fuel_type || null,
          car.engine || null,
          car.engine_cylinders || null,
          car.engine_displacement || null,
          car.horsepower || null,
          car.mpg_city || null,
          car.mpg_highway || null,
          car.features ? JSON.stringify(car.features) : null,
          car.description || null,
          car.images ? JSON.stringify(car.images) : null,
          car.dealer_id || 1, // Default to first dealer
          car.location_id || null,
          car.condition || null,
          car.title_status || null,
          car.url || null,
          car._qualityScore || 0,
          car.availability !== undefined ? car.availability : true
        ]);

        saved.push({
          id: result.rows[0].id,
          ...car
        });
      }

      await client.query('COMMIT');
      console.log(`Saved ${saved.length} vehicles`);
      return saved;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving inventory:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllInventory() {
    try {
      const result = await this.pool.query(`
        SELECT 
          v.*,
          d.name as dealer_name,
          dl.name as location_name,
          dl.city as location_city,
          dl.state as location_state
        FROM vehicles v
        LEFT JOIN dealers d ON v.dealer_id = d.id
        LEFT JOIN dealer_locations dl ON v.location_id = dl.id
        ORDER BY v.scraped_at DESC
      `);

      return result.rows.map(row => ({
        ...row,
        features: row.features ? JSON.parse(row.features) : [],
        images: row.images ? JSON.parse(row.images) : []
      }));
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw error;
    }
  }

  async getInventoryByLocation(locationId) {
    try {
      const result = await this.pool.query(`
        SELECT 
          v.*,
          d.name as dealer_name,
          dl.name as location_name
        FROM vehicles v
        LEFT JOIN dealers d ON v.dealer_id = d.id
        LEFT JOIN dealer_locations dl ON v.location_id = dl.id
        WHERE v.location_id = $1
        ORDER BY v.scraped_at DESC
      `, [locationId]);

      return result.rows.map(row => ({
        ...row,
        features: row.features ? JSON.parse(row.features) : [],
        images: row.images ? JSON.parse(row.images) : []
      }));
    } catch (error) {
      console.error('Error fetching inventory by location:', error);
      throw error;
    }
  }

  async deleteInventory(id) {
    try {
      const result = await this.pool.query(
        'DELETE FROM vehicles WHERE id = $1',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting inventory:', error);
      throw error;
    }
  }

  async clearInventory() {
    try {
      const result = await this.pool.query('DELETE FROM vehicles');
      return result.rowCount;
    } catch (error) {
      console.error('Error clearing inventory:', error);
      throw error;
    }
  }

  // New: Get all dealers
  async getAllDealers() {
    try {
      const result = await this.pool.query(`
        SELECT 
          d.*,
          COUNT(v.id) as vehicle_count,
          AVG(v.quality_score) as avg_quality,
          MIN(v.price) as min_price,
          MAX(v.price) as max_price
        FROM dealers d
        LEFT JOIN vehicles v ON d.id = v.dealer_id
        GROUP BY d.id
        ORDER BY d.created_at DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('Error fetching dealers:', error);
      throw error;
    }
  }

  // New: Get locations for a dealer
  async getDealerLocations(dealerId) {
    try {
      const result = await this.pool.query(`
        SELECT 
          dl.*,
          COUNT(v.id) as vehicle_count,
          AVG(v.quality_score) as avg_quality
        FROM dealer_locations dl
        LEFT JOIN vehicles v ON dl.id = v.location_id
        WHERE dl.dealer_id = $1
        GROUP BY dl.id
        ORDER BY dl.name ASC
      `, [dealerId]);

      return result.rows;
    } catch (error) {
      console.error('Error fetching dealer locations:', error);
      throw error;
    }
  }

  // New: Get statistics
  async getStats() {
    try {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total_vehicles,
          COUNT(DISTINCT make) as unique_makes,
          COUNT(DISTINCT model) as unique_models,
          COUNT(DISTINCT location_id) as locations_with_vehicles,
          AVG(quality_score) as avg_quality,
          MIN(price) as min_price,
          MAX(price) as max_price,
          AVG(price) as avg_price,
          SUM(CASE WHEN availability = true THEN 1 ELSE 0 END) as available_count,
          SUM(CASE WHEN quality_score >= 80 THEN 1 ELSE 0 END) as high_quality_count
        FROM vehicles
        WHERE vin IS NOT NULL
      `);

      return result.rows[0];
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }

  // New: Find by VIN
  async findByVin(vin) {
    try {
      const result = await this.pool.query(`
        SELECT 
          v.*,
          d.name as dealer_name,
          dl.name as location_name
        FROM vehicles v
        LEFT JOIN dealers d ON v.dealer_id = d.id
        LEFT JOIN dealer_locations dl ON v.location_id = dl.id
        WHERE v.vin = $1
      `, [vin.toUpperCase()]);

      return result.rows.map(row => ({
        ...row,
        features: row.features ? JSON.parse(row.features) : [],
        images: row.images ? JSON.parse(row.images) : []
      }));
    } catch (error) {
      console.error('Error finding by VIN:', error);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
    console.log('Database connection closed');
  }
}

module.exports = CarDatabase;
