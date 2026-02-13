const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class CarDatabase {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'cars.db'));
  }

  init() {
    return new Promise((resolve, reject) => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS inventory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source TEXT,
          scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          vin TEXT,
          year INTEGER,
          make TEXT,
          model TEXT,
          trim TEXT,
          price REAL,
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
          features TEXT,
          description TEXT,
          images TEXT,
          dealer_name TEXT,
          dealer_address TEXT,
          dealer_phone TEXT,
          dealer_email TEXT,
          stock_number TEXT,
          condition TEXT,
          title_status TEXT,
          url TEXT,
          raw_data TEXT,
          _qualityScore INTEGER,
          location_id INTEGER,
          availability INTEGER DEFAULT 1
        );
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  saveInventory(scrapeResult) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO inventory (
          source, vin, year, make, model, trim, price, mileage,
          exterior_color, interior_color, body_type, transmission,
          drivetrain, fuel_type, engine, engine_cylinders, engine_displacement,
          horsepower, mpg_city, mpg_highway, features, description,
          images, dealer_name, dealer_address, dealer_phone, dealer_email,
          stock_number, condition, title_status, url, raw_data, _qualityScore, location_id, availability
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let savedCount = 0;
      const saved = [];

      for (const car of scrapeResult.cars) {
        stmt.run(
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
          car.dealer_name || null,
          car.dealer_address || null,
          car.dealer_phone || null,
          car.dealer_email || null,
          car.stock_number || null,
          car.condition || null,
          car.title_status || null,
          car.url || null,
          car.raw_data ? JSON.stringify(car.raw_data) : null,
          car._qualityScore || 0,
          car.location_id || null,
          car.availability !== undefined ? car.availability : 1,
          function(err) {
            if (err) {
              console.error('Error saving car:', err);
            } else {
              savedCount++;
              saved.push({
                id: this.lastID,
                ...car
              });
            }
          }
        );
      }

      stmt.finalize();
      resolve(saved);
    });
  }

  getAllInventory() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM inventory ORDER BY scraped_at DESC', (err, rows) => {
        if (err) reject(err);
        else {
          const processed = rows.map(row => ({
            ...row,
            features: row.features ? JSON.parse(row.features) : [],
            images: row.images ? JSON.parse(row.images) : []
          }));
          resolve(processed);
        }
      });
    });
  }

  getInventoryByLocation(locationId) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM inventory WHERE location_id = ? ORDER BY scraped_at DESC', [locationId], (err, rows) => {
        if (err) reject(err);
        else {
          const processed = rows.map(row => ({
            ...row,
            features: row.features ? JSON.parse(row.features) : [],
            images: row.images ? JSON.parse(row.images) : []
          }));
          resolve(processed);
        }
      });
    });
  }

  getFilteredInventory(filters) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM inventory WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (filters.minPrice) {
        query += ` AND price >= ?`;
        params.push(filters.minPrice);
        paramCount++;
      }
      if (filters.maxPrice) {
        query += ` AND price <= ?`;
        params.push(filters.maxPrice);
        paramCount++;
      }
      if (filters.minYear) {
        query += ` AND year >= ?`;
        params.push(filters.minYear);
        paramCount++;
      }
      if (filters.maxYear) {
        query += ` AND year <= ?`;
        params.push(filters.maxYear);
        paramCount++;
      }
      if (filters.minQuality) {
        query += ` AND _qualityScore >= ?`;
        params.push(filters.minQuality);
        paramCount++;
      }
      if (filters.make) {
        query += ` AND make LIKE ?`;
        params.push(`%${filters.make}%`);
        paramCount++;
      }
      if (filters.model) {
        query += ` AND model LIKE ?`;
        params.push(`%${filters.model}%`);
        paramCount++;
      }
      if (filters.locationId) {
        query += ` AND location_id = ?`;
        params.push(filters.locationId);
        paramCount++;
      }

      query += ' ORDER BY scraped_at DESC';

      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else {
          const processed = rows.map(row => ({
            ...row,
            features: row.features ? JSON.parse(row.features) : [],
            images: row.images ? JSON.parse(row.images) : []
          }));
          resolve(processed);
        }
      });
    });
  }

  getStats() {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(*) as total,
          COUNT(DISTINCT make) as unique_makes,
          COUNT(DISTINCT model) as unique_models,
          AVG(price) as avg_price,
          MIN(price) as min_price,
          MAX(price) as max_price,
          AVG(_qualityScore) as avg_quality,
          COUNT(DISTINCT location_id) as locations_with_vehicles
        FROM inventory
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getVehicleCount() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT COUNT(*) as count FROM inventory', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }

  deleteInventory(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM inventory WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  clearInventory() {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM inventory', function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      this.db.close(() => {
        console.log('Database connection closed');
        resolve();
      });
    });
  }
}

module.exports = CarDatabase;
