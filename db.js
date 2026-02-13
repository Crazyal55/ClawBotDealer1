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
          raw_data TEXT
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
          stock_number, condition, title_status, url, raw_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const saved = [];
      let completed = 0;

      for (const car of scrapeResult.cars) {
        stmt.run(
          scrapeResult.source,
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
          function(err) {
            if (err) {
              console.error('Error saving car:', err);
            } else {
              saved.push({ id: this.lastID, ...car });
            }
            completed++;
            if (completed === scrapeResult.cars.length) {
              stmt.finalize();
              resolve(saved);
            }
          }
        );
      }
    });
  }

  getAllInventory() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM inventory ORDER BY scraped_at DESC', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const processed = rows.map(row => ({
            ...row,
            features: row.features ? JSON.parse(row.features) : [],
            images: row.images ? JSON.parse(row.images) : [],
            raw_data: row.raw_data ? JSON.parse(row.raw_data) : null
          }));

          // Check for duplicate VINs and add flags
          const vinCounts = {};
          processed.forEach(car => {
            if (car.vin) {
              vinCounts[car.vin] = (vinCounts[car.vin] || 0) + 1;
            }
          });

          processed.forEach(car => {
            if (car.vin && vinCounts[car.vin] > 1) {
              car._duplicateVin = true;
            }
          });

          resolve(processed);
        }
      });
    });
  }

  findByVin(vin) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM inventory WHERE vin = ?', [vin], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getDataQualityStats() {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT
          COUNT(*) as total,
          COUNT(vin) as has_vin,
          COUNT(price) as has_price,
          COUNT(mileage) as has_mileage,
          COUNT(year) as has_year,
          COUNT(make) as has_make,
          COUNT(model) as has_model,
          AVG(price) as avg_price,
          AVG(mileage) as avg_mileage
        FROM inventory
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getSources() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT
          source,
          COUNT(*) as count,
          MIN(scraped_at) as first_scrape,
          MAX(scraped_at) as last_scrape
        FROM inventory
        GROUP BY source
        ORDER BY count DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
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
}

module.exports = CarDatabase;
