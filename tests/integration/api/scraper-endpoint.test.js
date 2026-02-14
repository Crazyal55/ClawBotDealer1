const request = require('supertest');
const { app } = require('../../../../server_pg');
const DatabasePG = require('../../../../db_pg');

// Mock database
jest.mock('../../../../db_pg');
const MockedDatabasePG = DatabasePG;

describe('Scraper API Endpoints', () => {
  let mockDb;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock database instance
    mockDb = {
      saveInventory: jest.fn().mockResolvedValue({
        records: [],
        metrics: { inserted: 0, updated: 0, skipped: 0 }
      })
    };
    MockedDatabasePG.mockImplementation(() => mockDb);
  });

  afterEach(() => {
    if (app && app.close) {
      app.close();
    }
  });

  describe('POST /api/scrape', () => {
    const validPayload = {
      curlCommand: `curl 'https://example.com/vehicle' -H 'User-Agent: test'`,
      sourceName: 'Test Dealership'
    };

    it('should scrape and save inventory', async () => {
      mockDb.saveInventory.mockResolvedValue({
        records: [
          { vin: '1234567890ABCDEF01', make: 'Toyota', model: 'Camry' }
        ],
        metrics: { inserted: 1, updated: 0, skipped: 0 }
      });

      const response = await request(app)
        .post('/api/scrape')
        .send(validPayload)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('metrics');
      expect(mockDb.saveInventory).toHaveBeenCalled();
    });

    it('should require curlCommand in request body', async () => {
      const response = await request(app)
        .post('/api/scrape')
        .send({ sourceName: 'Test' })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle scraping errors gracefully', async () => {
      mockDb.saveInventory.mockRejectedValue(new Error('Scraping failed'));

      const response = await request(app)
        .post('/api/scrape')
        .send(validPayload)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Scraping failed');
    });

    it('should use default source name when not provided', async () => {
      mockDb.saveInventory.mockResolvedValue({
        records: [],
        metrics: { inserted: 0, updated: 0, skipped: 0 }
      });

      await request(app)
        .post('/api/scrape')
        .send({
          curlCommand: validPayload.curlCommand
        })
        .expect(200);

      expect(mockDb.saveInventory).toHaveBeenCalled();
    });

    it('should return scraped cars count in message', async () => {
      mockDb.saveInventory.mockResolvedValue({
        records: [
          { vin: '1234567890ABCDEF01' },
          { vin: '1234567890ABCDEF02' },
          { vin: '1234567890ABCDEF03' }
        ],
        metrics: { inserted: 3, updated: 0, skipped: 0 }
      });

      const response = await request(app)
        .post('/api/scrape')
        .send(validPayload)
        .expect(200);

      expect(response.body.message).toContain('3 cars');
    });
  });

  describe('POST /api/scrape/batch', () => {
    const validPayload = {
      curlCommands: [
        `curl 'https://example.com/vehicle1'`,
        `curl 'https://example.com/vehicle2'`,
        `curl 'https://example.com/vehicle3'`
      ],
      sourceName: 'Batch Test'
    };

    it('should scrape multiple sources', async () => {
      mockDb.saveInventory.mockResolvedValue({
        records: [],
        metrics: { inserted: 1, updated: 0, skipped: 0 }
      });

      const response = await request(app)
        .post('/api/scrape/batch')
        .send(validPayload)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('totalCars');
      expect(response.body).toHaveProperty('totalSources', 3);
      expect(response.body).toHaveProperty('metrics');
      expect(mockDb.saveInventory).toHaveBeenCalledTimes(3);
    });

    it('should require curlCommands array', async () => {
      const response = await request(app)
        .post('/api/scrape/batch')
        .send({ sourceName: 'Test' })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('curlCommands must be a non-empty array');
    });

    it('should reject empty curlCommands array', async () => {
      const response = await request(app)
        .post('/api/scrape/batch')
        .send({ curlCommands: [] })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('curlCommands must be a non-empty array');
    });

    it('should aggregate metrics from all scrapes', async () => {
      mockDb.saveInventory.mockResolvedValue({
        records: [],
        metrics: { inserted: 2, updated: 1, skipped: 0 }
      });

      const response = await request(app)
        .post('/api/scrape/batch')
        .send(validPayload)
        .expect(200);

      expect(response.body.metrics).toEqual({
        inserted: 6, // 2 per source * 3 sources
        updated: 3, // 1 per source * 3 sources
        skipped: 0
      });
    });

    it('should handle partial failures in batch', async () => {
      mockDb.saveInventory
        .mockResolvedValueOnce({
          records: [],
          metrics: { inserted: 1, updated: 0, skipped: 0 }
        })
        .mockRejectedValueOnce(new Error('Scrape failed'))
        .mockResolvedValueOnce({
          records: [],
          metrics: { inserted: 1, updated: 0, skipped: 0 }
        });

      const response = await request(app)
        .post('/api/scrape/batch')
        .send({
          curlCommands: [
            `curl 'https://example.com/1'`,
            `curl 'https://example.com/2'`,
            `curl 'https://example.com/3'`
          ]
        })
        .expect(200);

      expect(response.body.failed).toBe(1);
      expect(response.body.totalSources).toBe(2);
    });

    it('should return results array with per-source status', async () => {
      mockDb.saveInventory.mockResolvedValue({
        records: [],
        metrics: { inserted: 1, updated: 0, skipped: 0 }
      });

      const response = await request(app)
        .post('/api/scrape/batch')
        .send({
          curlCommands: [
            `curl 'https://example.com/1'`,
            `curl 'https://example.com/2'`
          ]
        })
        .expect(200);

      expect(response.body.results).toBeInstanceOf(Array);
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0]).toHaveProperty('success');
      expect(response.body.results[0]).toHaveProperty('cars');
      expect(response.body.results[0]).toHaveProperty('url');
    });

    it('should process in batches of 5', async () => {
      mockDb.saveInventory.mockResolvedValue({
        records: [],
        metrics: { inserted: 1, updated: 0, skipped: 0 }
      });

      const largeBatch = Array.from({ length: 12 }, (_, i) =>
        `curl 'https://example.com/${i}'`
      );

      const response = await request(app)
        .post('/api/scrape/batch')
        .send({ curlCommands: largeBatch })
        .expect(200);

      expect(mockDb.saveInventory).toHaveBeenCalledTimes(12);
      expect(response.body.totalSources).toBe(12);
    });
  });

  describe('POST /api/test', () => {
    const validPayload = {
      curlCommand: `curl 'https://example.com/vehicle' -H 'User-Agent: test'`,
      sourceName: 'Test Source'
    };

    it('should test scrape without saving', async () => {
      const response = await request(app)
        .post('/api/test')
        .send(validPayload)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Test scrape successful');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('source');
      expect(mockDb.saveInventory).not.toHaveBeenCalled();
    });

    it('should require curlCommand', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({ sourceName: 'Test' })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle test scrape errors', async () => {
      const response = await request(app)
        .post('/api/test')
        .send({
          curlCommand: 'invalid curl command'
        })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should return extracted car data', async () => {
      const response = await request(app)
        .post('/api/test')
        .send(validPayload)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should return source URL', async () => {
      const response = await request(app)
        .post('/api/test')
        .send(validPayload)
        .expect(200);

      expect(response.body.url).toBe('https://example.com/vehicle');
    });

    it('should return source name', async () => {
      const response = await request(app)
        .post('/api/test')
        .send(validPayload)
        .expect(200);

      expect(response.body.source).toBe('Test Source');
    });
  });

  describe('DELETE /api/inventory/:id', () => {
    it('should delete vehicle by ID', async () => {
      mockDb.deleteInventory = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/inventory/123')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(mockDb.deleteInventory).toHaveBeenCalledWith(123);
    });

    it('should return 404 if vehicle not found', async () => {
      mockDb.deleteInventory = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/inventory/999')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Not found');
    });

    it('should handle delete errors', async () => {
      mockDb.deleteInventory = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/inventory/123')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/inventory', () => {
    it('should clear all inventory', async () => {
      mockDb.clearInventory = jest.fn().mockResolvedValue(42);

      const response = await request(app)
        .delete('/api/inventory')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('42 records');
      expect(mockDb.clearInventory).toHaveBeenCalled();
    });

    it('should handle clear errors', async () => {
      mockDb.clearInventory = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/inventory')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/stats', () => {
    it('should return quality stats and sources', async () => {
      mockDb.getDataQualityStats = jest.fn().mockResolvedValue({
        totalVehicles: 100,
        avgQualityScore: 85,
        completeVehicles: 80
      });
      mockDb.getSources = jest.fn().mockResolvedValue([
        { name: 'Cars.com', count: 50 },
        { name: 'AutoTrader', count: 30 }
      ]);

      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('quality');
      expect(response.body).toHaveProperty('sources');
      expect(mockDb.getDataQualityStats).toHaveBeenCalled();
      expect(mockDb.getSources).toHaveBeenCalled();
    });

    it('should handle stats errors', async () => {
      mockDb.getDataQualityStats = jest.fn().mockRejectedValue(new Error('DB error'));
      mockDb.getSources = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/api/stats')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/stats/duplicates', () => {
    it('should find duplicate VINs', async () => {
      mockDb.pool = {
        query: jest.fn().mockResolvedValue({
          rows: [
            { vin: '1234567890ABCDEF01', count: 2, ids: [1, 2] },
            { vin: '9876543210ABCDEF01', count: 3, ids: [3, 4, 5] }
          ]
        })
      };

      const response = await request(app)
        .get('/api/stats/duplicates')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.duplicates).toBeInstanceOf(Array);
      expect(response.body.duplicates).toHaveLength(2);
      expect(response.body.duplicates[0]).toHaveProperty('vin');
      expect(response.body.duplicates[0]).toHaveProperty('count');
      expect(response.body.duplicates[0]).toHaveProperty('ids');
    });

    it('should return empty array when no duplicates', async () => {
      mockDb.pool = {
        query: jest.fn().mockResolvedValue({ rows: [] })
      };

      const response = await request(app)
        .get('/api/stats/duplicates')
        .expect(200);

      expect(response.body.duplicates).toHaveLength(0);
    });

    it('should handle duplicate check errors', async () => {
      mockDb.pool = {
        query: jest.fn().mockRejectedValue(new Error('Query failed'))
      };

      const response = await request(app)
        .get('/api/stats/duplicates')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/inventory/duplicates', () => {
    it('should delete duplicate VINs keeping newest', async () => {
      mockDb.pool = {
        query: jest.fn()
          .mockResolvedValueOnce({
            rows: [
              { vin: '1234567890ABCDEF01', keep_id: 2, all_ids: [1, 2] }
            ]
          })
          .mockResolvedValue({}) // DELETE queries
      };

      const response = await request(app)
        .delete('/api/inventory/duplicates')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('deletedCount');
      expect(mockDb.pool.query).toHaveBeenCalled();
    });

    it('should return deleted count', async () => {
      mockDb.pool = {
        query: jest.fn()
          .mockResolvedValueOnce({
            rows: [
              { vin: '1234567890ABCDEF01', keep_id: 2, all_ids: [1, 2] }
            ]
          })
          .mockResolvedValue({})
      };

      const response = await request(app)
        .delete('/api/inventory/duplicates')
        .expect(200);

      expect(response.body.deletedCount).toBeGreaterThan(0);
    });

    it('should handle deletion errors', async () => {
      mockDb.pool = {
        query: jest.fn().mockRejectedValue(new Error('Delete failed'))
      };

      const response = await request(app)
        .delete('/api/inventory/duplicates')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/inventory/vin/:vin', () => {
    it('should search vehicles by VIN', async () => {
      mockDb.findByVin = jest.fn().mockResolvedValue([
        { id: 1, vin: '1234567890ABCDEF01', make: 'Toyota' },
        { id: 2, vin: '1234567890ABCDEF01', make: 'Toyota' }
      ]);

      const response = await request(app)
        .get('/api/inventory/vin/1234567890ABCDEF01')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('matches', 2);
      expect(response.body).toHaveProperty('data');
      expect(mockDb.findByVin).toHaveBeenCalledWith('1234567890ABCDEF01');
    });

    it('should return empty array for VIN not found', async () => {
      mockDb.findByVin = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/api/inventory/vin/NOTFOUND')
        .expect(200);

      expect(response.body.matches).toBe(0);
      expect(response.body.data).toHaveLength(0);
    });

    it('should handle VIN search errors', async () => {
      mockDb.findByVin = jest.fn().mockRejectedValue(new Error('Search failed'));

      const response = await request(app)
        .get('/api/inventory/vin/1234567890ABCDEF01')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
