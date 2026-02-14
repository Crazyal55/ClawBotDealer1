const { createPool, getPoolConfig } = require('./pg_pool');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class CarDatabase {
  constructor() {
    this.pool = createPool();
    this.poolConfig = getPoolConfig();
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
        await this.ensureIngestionIndexes();
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
      const cars = Array.isArray(scrapeResult?.cars) ? scrapeResult.cars : [];
      if (cars.length === 0) {
        return { records: [], metrics: { inserted: 0, updated: 0, skipped: 0 } };
      }

      await client.query('BEGIN');

      const saved = [];
      const metrics = { inserted: 0, updated: 0, skipped: 0 };
      const source = this.normalizeText(scrapeResult.source) || 'unknown';
      const fallbackDealerId = await this.getDefaultDealerId(client);

      for (const car of cars) {
        const normalized = this.normalizeVehicleForIngestion(car, source, fallbackDealerId);
        if (!normalized.make && !normalized.model && !normalized.vin && !normalized.url) {
          metrics.skipped++;
          continue;
        }

        let result;
        if (normalized.vin) {
          result = await client.query(`
            INSERT INTO vehicles (
              source, vin, year, make, model, trim, price, mileage,
              exterior_color, interior_color, body_type, transmission,
              drivetrain, fuel_type, engine, engine_cylinders, engine_displacement,
              horsepower, mpg_city, mpg_highway, features, description,
              images, dealer_id, location_id, condition, title_status,
              stock_number, url, quality_score, availability
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, $19,
              $20, $21, $22, $23, $24, $25, $26, $27,
              $28, $29, $30, $31
            )
            ON CONFLICT (vin) DO UPDATE SET
              source = EXCLUDED.source,
              year = EXCLUDED.year,
              make = EXCLUDED.make,
              model = EXCLUDED.model,
              trim = EXCLUDED.trim,
              price = EXCLUDED.price,
              mileage = EXCLUDED.mileage,
              exterior_color = EXCLUDED.exterior_color,
              interior_color = EXCLUDED.interior_color,
              body_type = EXCLUDED.body_type,
              transmission = EXCLUDED.transmission,
              drivetrain = EXCLUDED.drivetrain,
              fuel_type = EXCLUDED.fuel_type,
              engine = EXCLUDED.engine,
              engine_cylinders = EXCLUDED.engine_cylinders,
              engine_displacement = EXCLUDED.engine_displacement,
              horsepower = EXCLUDED.horsepower,
              mpg_city = EXCLUDED.mpg_city,
              mpg_highway = EXCLUDED.mpg_highway,
              features = EXCLUDED.features,
              description = EXCLUDED.description,
              images = EXCLUDED.images,
              dealer_id = EXCLUDED.dealer_id,
              location_id = EXCLUDED.location_id,
              condition = EXCLUDED.condition,
              title_status = EXCLUDED.title_status,
              stock_number = EXCLUDED.stock_number,
              url = EXCLUDED.url,
              quality_score = EXCLUDED.quality_score,
              availability = EXCLUDED.availability,
              updated_at = CURRENT_TIMESTAMP
            RETURNING id
          `, normalized.params);

          saved.push({
            id: result.rows[0].id,
            ...car,
            _ingestionAction: 'upserted_by_vin'
          });
          metrics.updated++;
          continue;
        }

        const existingWithoutVin = await this.findExistingWithoutVin(client, normalized);
        if (existingWithoutVin) {
          result = await client.query(`
            UPDATE vehicles SET
              source = $2,
              year = $3,
              make = $4,
              model = $5,
              trim = $6,
              price = $7,
              mileage = $8,
              exterior_color = $9,
              interior_color = $10,
              body_type = $11,
              transmission = $12,
              drivetrain = $13,
              fuel_type = $14,
              engine = $15,
              engine_cylinders = $16,
              engine_displacement = $17,
              horsepower = $18,
              mpg_city = $19,
              mpg_highway = $20,
              features = $21,
              description = $22,
              images = $23,
              dealer_id = $24,
              location_id = $25,
              condition = $26,
              title_status = $27,
              stock_number = $28,
              url = $29,
              quality_score = $30,
              availability = $31,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id
          `, [existingWithoutVin.id, normalized.params[0], ...normalized.params.slice(2)]);

          saved.push({
            id: result.rows[0].id,
            ...car,
            _ingestionAction: 'updated_no_vin_match'
          });
          metrics.updated++;
          continue;
        }

        result = await client.query(`
          INSERT INTO vehicles (
            source, vin, year, make, model, trim, price, mileage,
            exterior_color, interior_color, body_type, transmission,
            drivetrain, fuel_type, engine, engine_cylinders, engine_displacement,
            horsepower, mpg_city, mpg_highway, features, description,
            images, dealer_id, location_id, condition, title_status,
            stock_number, url, quality_score, availability
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19,
            $20, $21, $22, $23, $24, $25, $26, $27,
            $28, $29, $30, $31
          )
          RETURNING id
        `, normalized.params);

        saved.push({
          id: result.rows[0].id,
          ...car,
          _ingestionAction: 'inserted_no_vin'
        });
        metrics.inserted++;
      }

      await client.query('COMMIT');
      console.log(`Saved ${saved.length} vehicles`);
      return { records: saved, metrics };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving inventory:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllInventory(filters = {}) {
    try {
      const clauses = [];
      const params = [];
      let paramIndex = 1;

      if (filters.dealerId) {
        clauses.push(`v.dealer_id = $${paramIndex++}`);
        params.push(Number(filters.dealerId));
      }
      if (filters.locationId) {
        clauses.push(`v.location_id = $${paramIndex++}`);
        params.push(Number(filters.locationId));
      }
      if (filters.make) {
        clauses.push(`LOWER(v.make) = LOWER($${paramIndex++})`);
        params.push(filters.make);
      }
      if (filters.model) {
        clauses.push(`LOWER(v.model) LIKE LOWER($${paramIndex++})`);
        params.push(`%${filters.model}%`);
      }
      if (filters.drivetrain) {
        clauses.push(`LOWER(v.drivetrain) = LOWER($${paramIndex++})`);
        params.push(filters.drivetrain);
      }
      if (filters.minPrice) {
        clauses.push(`v.price >= $${paramIndex++}`);
        params.push(Number(filters.minPrice));
      }
      if (filters.maxPrice) {
        clauses.push(`v.price <= $${paramIndex++}`);
        params.push(Number(filters.maxPrice));
      }

      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
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
        ${where}
        ORDER BY v.scraped_at DESC
      `, params);

      return result.rows.map(row => ({
        ...row,
      features: this.parseJsonArray(row.features),
      images: this.parseJsonArray(row.images)
      }));
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw error;
    }
  }

  async createInventory(vehicle) {
    this.validateCreatePayload(vehicle);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const fallbackDealerId = await this.getDefaultDealerId(client);
      const normalized = this.normalizeVehicleForIngestion(
        vehicle,
        this.normalizeText(vehicle.source) || 'manual',
        fallbackDealerId
      );

      const result = await client.query(`
        INSERT INTO vehicles (
          source, vin, year, make, model, trim, price, mileage,
          exterior_color, interior_color, body_type, transmission,
          drivetrain, fuel_type, engine, engine_cylinders, engine_displacement,
          horsepower, mpg_city, mpg_highway, features, description,
          images, dealer_id, location_id, condition, title_status,
          stock_number, url, quality_score, availability
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26, $27,
          $28, $29, $30, $31
        )
        RETURNING *
      `, normalized.params);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateInventory(id, data) {
    this.validateUpdatePayload(id, data);
    const allowedMap = {
      year: 'year',
      make: 'make',
      model: 'model',
      trim: 'trim',
      price: 'price',
      mileage: 'mileage',
      exterior_color: 'exterior_color',
      interior_color: 'interior_color',
      body_type: 'body_type',
      transmission: 'transmission',
      drivetrain: 'drivetrain',
      fuel_type: 'fuel_type',
      condition: 'condition',
      title_status: 'title_status',
      stock_number: 'stock_number',
      source: 'source',
      url: 'url',
      quality_score: 'quality_score',
      availability: 'availability',
      description: 'description'
    };

    const updates = [];
    const values = [];
    let i = 1;

    Object.entries(allowedMap).forEach(([inputKey, column]) => {
      if (data[inputKey] !== undefined) {
        updates.push(`${column} = $${i++}`);
        values.push(data[inputKey]);
      }
    });

    if (data.features !== undefined) {
      updates.push(`features = $${i++}`);
      values.push(JSON.stringify(this.normalizeArrayField(data.features)));
    }
    if (data.images !== undefined) {
      updates.push(`images = $${i++}`);
      values.push(JSON.stringify(this.normalizeArrayField(data.images)));
    }

    if (!updates.length) {
      throw new ValidationError('No valid fields provided for update');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(Number(id));

    const result = await this.pool.query(`
      UPDATE vehicles
      SET ${updates.join(', ')}
      WHERE id = $${i}
      RETURNING *
    `, values);

    if (!result.rows.length) return null;
    return result.rows[0];
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
        features: this.parseJsonArray(row.features),
        images: this.parseJsonArray(row.images)
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
        features: this.parseJsonArray(row.features),
        images: this.parseJsonArray(row.images)
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

  getPoolStats() {
    return {
      max: this.poolConfig.max,
      idleTimeoutMillis: this.poolConfig.idleTimeoutMillis,
      connectionTimeoutMillis: this.poolConfig.connectionTimeoutMillis,
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  async getDealershipOverview() {
    const dealers = await this.pool.query(`
      SELECT
        d.id,
        d.name,
        COUNT(v.id) AS vehicle_count,
        COUNT(DISTINCT v.location_id) AS active_locations,
        AVG(v.price) AS avg_price,
        AVG(v.quality_score) AS avg_quality
      FROM dealers d
      LEFT JOIN vehicles v ON v.dealer_id = d.id
      GROUP BY d.id
      ORDER BY d.name
    `);

    const locations = await this.pool.query(`
      SELECT
        dl.id,
        dl.dealer_id,
        dl.name,
        dl.city,
        dl.state,
        COUNT(v.id) AS vehicle_count,
        AVG(v.price) AS avg_price,
        AVG(v.quality_score) AS avg_quality
      FROM dealer_locations dl
      LEFT JOIN vehicles v ON v.location_id = dl.id
      GROUP BY dl.id
      ORDER BY dl.dealer_id, dl.name
    `);

    return {
      businesses: dealers.rows,
      locations: locations.rows
    };
  }

  async runDataQualityVerification(limit = 200) {
    const rows = await this.pool.query(`
      SELECT id, vin, year, make, model, price, mileage, drivetrain, location_id
      FROM vehicles
      ORDER BY updated_at DESC NULLS LAST, scraped_at DESC NULLS LAST
      LIMIT $1
    `, [Number(limit)]);

    const findings = [];
    for (const v of rows.rows) {
      const issues = [];
      if (!v.make || !v.model) issues.push('missing_make_or_model');
      if (!v.price || Number(v.price) <= 0) issues.push('invalid_price');
      if (v.year && (v.year < 1980 || v.year > new Date().getFullYear() + 2)) issues.push('invalid_year');
      if (v.mileage !== null && Number(v.mileage) < 0) issues.push('invalid_mileage');
      if (!v.vin || String(v.vin).length !== 17) issues.push('missing_or_invalid_vin');
      if (!v.drivetrain) issues.push('missing_powertrain');
      if (!v.location_id) issues.push('missing_location');
      if (issues.length) {
        findings.push({
          id: v.id,
          vin: v.vin,
          issues
        });
      }
    }

    return {
      scanned: rows.rows.length,
      flagged: findings.length,
      findings
    };
  }

  normalizeText(value) {
    if (typeof value !== 'string') return null;
    const cleaned = value.trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  normalizeNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  normalizeInteger(value) {
    const n = this.normalizeNumber(value);
    return n === null ? null : Math.round(n);
  }

  normalizeBoolean(value, fallback = true) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
    return fallback;
  }

  normalizeVin(vin) {
    if (!vin) return null;
    const normalized = String(vin).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return normalized.length === 17 ? normalized : null;
  }

  clampQualityScore(score) {
    const n = this.normalizeInteger(score);
    if (n === null) return 0;
    return Math.max(0, Math.min(100, n));
  }

  normalizeArrayField(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  parseJsonArray(value) {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async getDefaultDealerId(client) {
    const result = await client.query('SELECT id FROM dealers ORDER BY id ASC LIMIT 1');
    return result.rows[0]?.id || 1;
  }

  normalizeVehicleForIngestion(car, source, fallbackDealerId) {
    const vin = this.normalizeVin(car.vin);
    const year = this.normalizeInteger(car.year);
    const price = this.normalizeNumber(car.price);
    const mileage = this.normalizeInteger(car.mileage);
    const dealerId = this.normalizeInteger(car.dealer_id) || fallbackDealerId;
    const locationId = this.normalizeInteger(car.location_id);
    const qualityScore = this.clampQualityScore(car._qualityScore || car.quality_score);

    const params = [
      source,
      vin,
      year,
      this.normalizeText(car.make),
      this.normalizeText(car.model),
      this.normalizeText(car.trim),
      price,
      mileage,
      this.normalizeText(car.exterior_color),
      this.normalizeText(car.interior_color),
      this.normalizeText(car.body_type),
      this.normalizeText(car.transmission),
      this.normalizeText(car.drivetrain),
      this.normalizeText(car.fuel_type),
      this.normalizeText(car.engine),
      this.normalizeText(car.engine_cylinders),
      this.normalizeText(car.engine_displacement),
      this.normalizeInteger(car.horsepower),
      this.normalizeInteger(car.mpg_city),
      this.normalizeInteger(car.mpg_highway),
      JSON.stringify(this.normalizeArrayField(car.features)),
      this.normalizeText(car.description),
      JSON.stringify(this.normalizeArrayField(car.images)),
      dealerId,
      locationId,
      this.normalizeText(car.condition),
      this.normalizeText(car.title_status),
      this.normalizeText(car.stock_number),
      this.normalizeText(car.url),
      qualityScore,
      this.normalizeBoolean(car.availability, true)
    ];

    return {
      vin,
      stockNumber: params[27],
      url: params[28],
      dealerId,
      locationId,
      make: params[3],
      model: params[4],
      params
    };
  }

  async findExistingWithoutVin(client, normalized) {
    if (!normalized.url && !normalized.stockNumber) return null;

    const result = await client.query(`
      SELECT id
      FROM vehicles
      WHERE vin IS NULL
        AND dealer_id = $1
        AND (
          ($2::text IS NOT NULL AND url = $2)
          OR ($3::text IS NOT NULL AND stock_number = $3)
        )
      ORDER BY updated_at DESC NULLS LAST, scraped_at DESC NULLS LAST
      LIMIT 1
    `, [normalized.dealerId, normalized.url, normalized.stockNumber]);

    return result.rows[0] || null;
  }

  async ensureIngestionIndexes() {
    try {
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles (vin)');
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_vehicles_price ON vehicles (price)');
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles (year)');
      await this.pool.query('CREATE INDEX IF NOT EXISTS idx_vehicles_make ON vehicles (make)');
      await this.pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_dealer_stock
        ON vehicles (dealer_id, stock_number)
        WHERE stock_number IS NOT NULL
      `);
    } catch (error) {
      console.warn('Could not enforce unique dealer+stock_number index:', error.message);
    }
  }

  validateCreatePayload(data) {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Payload must be a JSON object');
    }

    if (!this.normalizeText(data.make) || !this.normalizeText(data.model)) {
      throw new ValidationError('make and model are required');
    }

    const year = this.normalizeInteger(data.year);
    if (!year || year < 1980 || year > new Date().getFullYear() + 2) {
      throw new ValidationError('year is required and must be valid');
    }

    const vin = this.normalizeVin(data.vin);
    const stock = this.normalizeText(data.stock_number);
    const url = this.normalizeText(data.url);
    if (!vin && !stock && !url) {
      throw new ValidationError('Provide at least one identifier: vin, stock_number, or url');
    }

    if (data.price !== undefined) {
      const price = this.normalizeNumber(data.price);
      if (price === null || price <= 0) {
        throw new ValidationError('price must be a positive number when provided');
      }
    }
  }

  validateUpdatePayload(id, data) {
    const parsedId = Number(id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new ValidationError('Invalid inventory id');
    }

    if (!data || typeof data !== 'object') {
      throw new ValidationError('Payload must be a JSON object');
    }

    if (Object.keys(data).length === 0) {
      throw new ValidationError('At least one field is required for update');
    }

    if (data.year !== undefined) {
      const year = this.normalizeInteger(data.year);
      if (!year || year < 1980 || year > new Date().getFullYear() + 2) {
        throw new ValidationError('year must be valid when provided');
      }
    }

    if (data.price !== undefined) {
      const price = this.normalizeNumber(data.price);
      if (price === null || price <= 0) {
        throw new ValidationError('price must be a positive number when provided');
      }
    }

    if (data.vin !== undefined && data.vin !== null && data.vin !== '') {
      if (!this.normalizeVin(data.vin)) {
        throw new ValidationError('vin must be 17 alphanumeric chars when provided');
      }
    }
  }
}

module.exports = CarDatabase;
module.exports.ValidationError = ValidationError;
