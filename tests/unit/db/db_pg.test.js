/**
 * Unit Tests: Database (db_pg.js)
 * Tests for database operations, data normalization, and CRUD functionality
 */

const Database = require('../../../db_pg');
const { cleanTestData } = require('../../helpers/db');

describe('CarDatabase', () => {
  let db;

  beforeAll(async () => {
    // Use test database
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/clawbot_test';

    db = new Database();
    await db.init();
  });

  afterAll(async () => {
    await db.close();
  });

  afterEach(async () => {
    // Clean up test data between tests
    await cleanTestData();
  });

  describe('saveInventory()', () => {
    test('should save single vehicle', async () => {
      const result = await db.saveInventory({
        source: 'test',
        cars: [{
          vin: 'TEST12345678901234',
          year: 2020,
          make: 'Toyota',
          model: 'Camry',
          price: 25000,
          mileage: 50000,
          url: 'https://example.com/car1'
        }]
      });

      expect(result).toHaveLength(1);
      expect(result[0].vin).toBe('TEST12345678901234');
      expect(result[0].make).toBe('Toyota');
      expect(result[0].model).toBe('Camry');
    });

    test('should handle duplicate VINs with upsert', async () => {
      // First save
      await db.saveInventory({
        source: 'test1',
        cars: [{
          vin: 'DUP12345678901234',
          price: 20000,
          year: 2020
        }]
      });

      // Update with same VIN
      const result = await db.saveInventory({
        source: 'test2',
        cars: [{
          vin: 'DUP12345678901234',
          price: 22000,  // Updated price
          year: 2021      // Updated year
        }]
      });

      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(22000); // Updated
      expect(result[0].year).toBe(2021);
    });

    test('should save multiple vehicles', async () => {
      const result = await db.saveInventory({
        source: 'test',
        cars: [
          { vin: '11111111111111111', make: 'Toyota', model: 'Camry', price: 20000 },
          { vin: '22222222222222222', make: 'Honda', model: 'Civic', price: 18000 },
          { vin: '33333333333333333', make: 'Ford', model: 'Mustang', price: 35000 }
        ]
      });

      expect(result).toHaveLength(3);
    });

    test('should handle empty cars array', async () => {
      const result = await db.saveInventory({
        source: 'test',
        cars: []
      });

      expect(result).toHaveLength(0);
    });

    test('should normalize data', async () => {
      const result = await db.saveInventory({
        source: 'test',
        cars: [{
          vin: '  norm123456789012  ',  // Spaces
          price: '25,000',              // Comma
          year: '2020',                 // String
          make: '  toyota  ',           // Case/spaces
          model: null
        }]
      });

      expect(result[0].vin).toBe('NORM123456789012'); // Cleaned
      expect(result[0].price).toBe(25000); // Number
      expect(result[0].make).toBe('Toyota'); // Trimmed
    });

    test('should parse JSON fields', async () => {
      const result = await db.saveInventory({
        source: 'test',
        cars: [{
          vin: 'JSON12345678901234',
          features: ['Feature 1', 'Feature 2'],
          images: ['img1.jpg', 'img2.jpg']
        }]
      });

      const vehicle = await db.getAllInventory();

      expect(vehicle[0].features).toEqual(['Feature 1', 'Feature 2']);
      expect(vehicle[0].images).toEqual(['img1.jpg', 'img2.jpg']);
    });
  });

  describe('getAllInventory()', () => {
    beforeEach(async () => {
      await db.saveInventory({
        source: 'test',
        cars: [
          { vin: '11111111111111111', make: 'Toyota', model: 'Camry', price: 20000 },
          { vin: '22222222222222222', make: 'Honda', model: 'Civic', price: 18000 },
          { vin: '33333333333333333', make: 'Toyota', model: 'Corolla', price: 19000 }
        ]
      });
    });

    test('should return all vehicles', async () => {
      const inventory = await db.getAllInventory();

      expect(inventory).toHaveLength(3);
    });

    test('should filter by make', async () => {
      const toyotas = await db.getAllInventory({ make: 'Toyota' });

      expect(toyotas).toHaveLength(2);
      expect(toyotas.every(v => v.make === 'Toyota')).toBe(true);
    });

    test('should filter by model (partial match)', async () => {
      const camrys = await db.getAllInventory({ model: 'Camry' });

      expect(camrys).toHaveLength(1);
      expect(camrys[0].model).toBe('Camry');
    });

    test('should filter by price range', async () => {
      const affordable = await db.getAllInventory({
        minPrice: 18000,
        maxPrice: 19000
      });

      expect(affordable).toHaveLength(1);
      expect(affordable[0].model).toBe('Civic');
    });

    test('should combine multiple filters', async () => {
      const results = await db.getAllInventory({
        make: 'Toyota',
        maxPrice: 20000
      });

      expect(results).toHaveLength(1);
      expect(results[0].model).toBe('Corolla');
    });
  });

  describe('createInventory()', () => {
    test('should create new vehicle', async () => {
      const vehicle = {
        vin: 'NEW12345678901234',
        make: 'Lexus',
        model: 'RX 350',
        price: 45000
      };

      const created = await db.createInventory(vehicle);

      expect(created.vin).toBe('NEW12345678901234');
      expect(created.make).toBe('Lexus');
      expect(created.id).toBeDefined();
    });

    test('should assign default dealer', async () => {
      const vehicle = {
        vin: 'DEF45678901234567',
        make: 'Test'
      };

      const created = await db.createInventory(vehicle);

      expect(created.dealer_id).toBeDefined();
    });
  });

  describe('updateInventory()', () => {
    test('should update existing vehicle', async () => {
      const created = await db.createInventory({
        vin: 'UPD12345678901234',
        make: 'Toyota',
        price: 20000
      });

      const updated = await db.updateInventory(created.id, {
        price: 22000,
        mileage: 50000
      });

      expect(updated.price).toBe(22000);
      expect(updated.mileage).toBe(50000);
      expect(updated.make).toBe('Toyota'); // Unchanged
    });

    test('should return null for non-existent ID', async () => {
      const updated = await db.updateInventory(999999, {
        price: 100
      });

      expect(updated).toBeNull();
    });

    test('should only update allowed fields', async () => {
      const created = await db.createInventory({
        vin: 'SEC12345678901234',
        make: 'Toyota'
      });

      const updated = await db.updateInventory(created.id, {
        make: 'Honda',
        id: 99999,  // Should be ignored
        created_at: '2020-01-01'  // Should be ignored
      });

      expect(updated.make).toBe('Honda');
      expect(updated.id).toBe(created.id); // Not changed
    });
  });

  describe('data normalization', () => {
    test('should validate VIN format (17 chars)', async () => {
      const result = await db.saveInventory({
        source: 'test',
        cars: [
          { vin: 'SHORT', make: 'Test' },  // Too short
          { vin: 'TOOLONG12345678901', make: 'Test' },  // Too long
          { vin: 'VALID12345678901', make: 'Valid' }  // Valid
        ]
      });

      expect(result).toHaveLength(1);
      expect(result[0].vin).toBe('VALID12345678901');
    });

    test('should normalize numbers', async () => {
      const result = await db.saveInventory({
        source: 'test',
        cars: [{
          vin: 'NUM12345678901234',
          price: '25,000.50',  // String with comma
          mileage: '50000',     // String
          year: 2020.5          // Float
        }]
      });

      expect(result[0].price).toBe(25000.50);
      expect(result[0].mileage).toBe(50000);
      expect(result[0].year).toBe(2020); // Rounded
    });

    test('should normalize text fields', async () => {
      const result = await db.saveInventory({
        source: 'test',
        cars: [{
          vin: 'TXT12345678901234',
          make: '  toyota  ',
          model: '',
          exterior_color: null,
          transmission: undefined
        }]
      });

      expect(result[0].make).toBe('Toyota'); // Trimmed
      expect(result[0].model).toBeNull(); // Empty string -> null
      expect(result[0].exterior_color).toBeNull();
      expect(result[0].transmission).toBeNull();
    });

    test('should clamp quality score to 0-100', async () => {
      const result = await db.saveInventory({
        source: 'test',
        cars: [
          { vin: 'Q0012345678901234', quality_score: -50 },
          { vin: 'Q0022345678901234', quality_score: 150 },
          { vin: 'Q0032345678901234', quality_score: 75 }
        ]
      });

      expect(result[0].quality_score).toBe(0); // Clamped to min
      expect(result[1].quality_score).toBe(100); // Clamped to max
      expect(result[2].quality_score).toBe(75); // Unchanged
    });
  });

  describe('error handling', () => {
    test('should handle invalid SQL gracefully', async () => {
      // This should not throw, but return empty or handle error
      const result = await db.getAllInventory({ make: "'; DROP TABLE vehicles; --" });

      expect(result).toBeDefined();
      // Should either be empty or handle SQL injection safely
    });

    test('should handle null values in filters', async () => {
      const result = await db.getAllInventory({
        make: null,
        model: undefined
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('utility methods', () => {
    test('should normalize VIN correctly', () => {
      const db2 = new Database();

      expect(db2.normalizeVin('  abc123456789012  ')).toBe('ABC123456789012');
      expect(db2.normalizeVin('short')).toBeNull();
      expect(db2.normalizeVin(null)).toBeNull();
    });

    test('should normalize numbers correctly', () => {
      const db2 = new Database();

      expect(db2.normalizeNumber('25,000')).toBe(25000);
      expect(db2.normalizeNumber(' 50000 ')).toBe(50000);
      expect(db2.normalizeNumber('')).toBeNull();
      expect(db2.normalizeNumber(null)).toBeNull();
      expect(db2.normalizeNumber(NaN)).toBeNull();
    });

    test('should parse JSON arrays safely', async () => {
      await db.saveInventory({
        source: 'test',
        cars: [{
          vin: 'PARSE12345678901234',
          features: ['Feature 1', 'Feature 2']
        }]
      });

      const inventory = await db.getAllInventory();

      expect(inventory[0].features).toEqual(['Feature 1', 'Feature 2']);
    });

    test('should handle invalid JSON gracefully', async () => {
      // Insert manually with invalid JSON
      await db.pool.query(`
        INSERT INTO vehicles (vin, make, features, images)
        VALUES ('BAD12345678901234', 'Test', 'not json', 'also not json')
      `);

      const inventory = await db.getAllInventory({ make: 'Test' });

      expect(inventory[0].features).toEqual([]);
      expect(inventory[0].images).toEqual([]);
    });
  });
});
