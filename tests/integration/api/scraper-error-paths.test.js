jest.mock('../../../db_pg', () =>
  jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    saveInventory: jest.fn().mockResolvedValue({
      records: [{ id: 1 }],
      metrics: { inserted: 1, updated: 0, skipped: 0 }
    }),
    getPoolStats: jest.fn().mockReturnValue({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
    close: jest.fn().mockResolvedValue(undefined),
    pool: { query: jest.fn().mockResolvedValue({ rows: [] }) }
  }))
);

jest.mock('../../../scraper', () => ({
  fromCurl: jest.fn()
}));

const DatabasePG = require('../../../db_pg');
const scraper = require('../../../scraper');
const { app } = require('../../../server_pg');

describe('Scraper API Error Paths', () => {
  let baseUrl;
  let server;
  let dbInstance;

  beforeAll(async () => {
    server = app.listen(0);
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    dbInstance = DatabasePG.mock.instances[0];
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  async function postJson(path, payload) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    return { status: response.status, body };
  }

  describe('POST /api/test - Error Handling', () => {
    it('returns 500 for invalid curl command', async () => {
      scraper.fromCurl.mockRejectedValue(new Error('Invalid curl command'));

      const response = await postJson('/api/test', {
        curlCommand: 'invalid-cmd',
        sourceName: 'test-source'
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid curl command');
    });

    it('returns 500 for network errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      networkError.code = 'ECONNREFUSED';
      scraper.fromCurl.mockRejectedValue(networkError);

      const response = await postJson('/api/test', {
        curlCommand: "curl 'https://example.com'",
        sourceName: 'test-source'
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('returns 500 for timeout errors', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      scraper.fromCurl.mockRejectedValue(timeoutError);

      const response = await postJson('/api/test', {
        curlCommand: "curl 'https://example.com'",
        sourceName: 'test-source'
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('returns 500 for scraper exceptions', async () => {
      scraper.fromCurl.mockImplementation(() => {
        throw new Error('Scraper internal error');
      });

      const response = await postJson('/api/test', {
        curlCommand: "curl 'https://example.com'",
        sourceName: 'test-source'
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/scrape - Error Handling', () => {
    it('returns 500 when scraper fails', async () => {
      scraper.fromCurl.mockRejectedValue(new Error('Scraping failed'));

      const response = await postJson('/api/scrape', {
        curlCommand: "curl 'https://example.com'",
        sourceName: 'test-source'
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Scraping failed');
    });

    it('returns 500 when database save fails', async () => {
      scraper.fromCurl.mockResolvedValue({
        source: 'test-source',
        url: 'https://example.com',
        cars: [{ vin: '1234567890ABCDEF01' }]
      });

      dbInstance.saveInventory.mockRejectedValue(new Error('Database connection lost'));

      const response = await postJson('/api/scrape', {
        curlCommand: "curl 'https://example.com'",
        sourceName: 'test-source'
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('returns 500 for database constraint violations', async () => {
      scraper.fromCurl.mockResolvedValue({
        source: 'test-source',
        url: 'https://example.com',
        cars: [{ vin: '1234567890ABCDEF01' }]
      });

      const constraintError = new Error('Duplicate VIN');
      constraintError.code = '23505';
      dbInstance.saveInventory.mockRejectedValue(constraintError);

      const response = await postJson('/api/scrape', {
        curlCommand: "curl 'https://example.com'",
        sourceName: 'test-source'
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('handles partial batch failures', async () => {
      scraper.fromCurl
        .mockResolvedValueOnce({
          source: 'src-a',
          url: 'https://example.com/a',
          cars: [{ vin: 'A' }]
        })
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          source: 'src-c',
          url: 'https://example.com/c',
          cars: [{ vin: 'C' }]
        });

      dbInstance.saveInventory
        .mockResolvedValueOnce({
          records: [{ id: 1 }],
          metrics: { inserted: 1, updated: 0, skipped: 0 }
        })
        .mockResolvedValueOnce({
          records: [{ id: 3 }],
          metrics: { inserted: 1, updated: 0, skipped: 0 }
        });

      const response = await postJson('/api/scrape/batch', {
        curlCommands: [
          "curl 'https://example.com/a'",
          "curl 'https://example.com/b'",
          "curl 'https://example.com/c'"
        ],
        sourceName: 'batch-test'
      });

      expect(response.status).toBe(200);
      expect(response.body.failed).toBe(1);
      expect(response.body.totalSources).toBe(2);
    });

    it('aggregates metrics correctly with partial failures', async () => {
      scraper.fromCurl
        .mockResolvedValueOnce({
          source: 'src-a',
          url: 'https://example.com/a',
          cars: [{ vin: 'A' }]
        })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({
          source: 'src-c',
          url: 'https://example.com/c',
          cars: [{ vin: 'C' }]
        });

      dbInstance.saveInventory
        .mockResolvedValueOnce({
          records: [{ id: 1 }],
          metrics: { inserted: 1, updated: 0, skipped: 0 }
        })
        .mockResolvedValueOnce({
          records: [{ id: 3 }],
          metrics: { inserted: 1, updated: 0, skipped: 0 }
        });

      const response = await postJson('/api/scrape/batch', {
        curlCommands: [
          "curl 'https://example.com/a'",
          "curl 'https://example.com/b'",
          "curl 'https://example.com/c'"
        ],
        sourceName: 'batch-test'
      });

      expect(response.status).toBe(200);
      expect(response.body.metrics.inserted).toBe(2);
      expect(response.body.failed).toBe(1);
    });
  });

  describe('POST /api/scrape/batch - Error Handling', () => {
    it('returns 400 for missing curlCommands', async () => {
      const response = await postJson('/api/scrape/batch', {
        sourceName: 'test'
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('curlCommands must be a non-empty array');
    });

    it('returns 400 for non-array curlCommands', async () => {
      const response = await postJson('/api/scrape/batch', {
        curlCommands: "not-an-array",
        sourceName: 'test'
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('returns 400 for empty curlCommands array', async () => {
      const response = await postJson('/api/scrape/batch', {
        curlCommands: [],
        sourceName: 'test'
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('curlCommands must be a non-empty array');
    });

    it('returns 400 for batch with invalid curl commands', async () => {
      scraper.fromCurl.mockRejectedValue(new Error('Invalid URL'));
      dbInstance.saveInventory.mockResolvedValue({
        records: [],
        metrics: { inserted: 0, updated: 0, skipped: 0 }
      });

      const response = await postJson('/api/scrape/batch', {
        curlCommands: ['invalid', 'commands'],
        sourceName: 'test'
      });

      expect(response.status).toBe(200);
      expect(response.body.failed).toBe(2);
      expect(response.body.totalSources).toBe(0);
    });

    it('handles all sources failing', async () => {
      scraper.fromCurl
        .mockRejectedValueOnce(new Error('Failed 1'))
        .mockRejectedValueOnce(new Error('Failed 2'))
        .mockRejectedValueOnce(new Error('Failed 3'));

      const response = await postJson('/api/scrape/batch', {
        curlCommands: [
          "curl 'https://example.com/1'",
          "curl 'https://example.com/2'",
          "curl 'https://example.com/3'"
        ],
        sourceName: 'test'
      });

      expect(response.status).toBe(200);
      expect(response.body.failed).toBe(3);
      expect(response.body.totalCars).toBe(0);
    });

    it('handles large batch sizes', async () => {
      const largeBatch = Array.from({ length: 100 }, (_, i) => `curl 'https://example.com/${i}'`);

      scraper.fromCurl.mockResolvedValue({
        source: 'test',
        url: 'https://example.com',
        cars: []
      });

      dbInstance.saveInventory.mockResolvedValue({
        records: [],
        metrics: { inserted: 0, updated: 0, skipped: 0 }
      });

      const response = await postJson('/api/scrape/batch', {
        curlCommands: largeBatch.slice(0, 10),
        sourceName: 'test'
      });

      expect(response.status).toBe(200);
      expect(response.body.totalSources).toBe(10);
    });
  });

  describe('Database Connection Errors', () => {
    it('handles database connection timeout', async () => {
      scraper.fromCurl.mockResolvedValue({
        source: 'test',
        url: 'https://example.com',
        cars: [{ vin: '1234567890ABCDEF01' }]
      });

      const timeoutError = new Error('Database connection timeout');
      timeoutError.code = 'ECONNREFUSED';
      dbInstance.saveInventory.mockRejectedValue(timeoutError);

      const response = await postJson('/api/scrape', {
        curlCommand: "curl 'https://example.com'",
        sourceName: 'test'
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('handles database pool exhaustion', async () => {
      scraper.fromCurl.mockResolvedValue({
        source: 'test',
        url: 'https://example.com',
        cars: [{ vin: '1234567890ABCDEF01' }]
      });

      const poolError = new Error('Connection pool exhausted');
      poolError.code = 'POOL_EXHAUSTED';
      dbInstance.saveInventory.mockRejectedValue(poolError);

      const response = await postJson('/api/scrape', {
        curlCommand: "curl 'https://example.com'",
        sourceName: 'test'
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('handles database query timeout', async () => {
      scraper.fromCurl.mockResolvedValue({
        source: 'test',
        url: 'https://example.com',
        cars: [{ vin: '1234567890ABCDEF01' }]
      });

      const queryError = new Error('Query timeout');
      queryError.code = 'QUERY_TIMEOUT';
      dbInstance.saveInventory.mockRejectedValue(queryError);

      const response = await postJson('/api/scrape', {
        curlCommand: "curl 'https://example.com'",
        sourceName: 'test'
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Malformed Request Handling', () => {
    it('handles missing Content-Type header', async () => {
      const response = await fetch(`${baseUrl}/api/scrape`, {
        method: 'POST',
        body: JSON.stringify({
          curlCommand: "curl 'https://example.com'",
          sourceName: 'test'
        })
      });

      expect(response.status).toBe(400);
    });

    it('handles invalid JSON body', async () => {
      const response = await fetch(`${baseUrl}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      expect(response.status).toBe(400);
    });

    it('handles oversized payload', async () => {
      const largePayload = {
        curlCommands: Array.from({ length: 10000 }, (_, i) => `curl 'https://example.com/${i}'`),
        sourceName: 'test'
      };

      const response = await postJson('/api/scrape/batch', largePayload);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('handles multiple simultaneous requests', async () => {
      scraper.fromCurl.mockResolvedValue({
        source: 'test',
        url: 'https://example.com',
        cars: [{ vin: '1234567890ABCDEF01' }]
      });

      dbInstance.saveInventory.mockResolvedValue({
        records: [{ id: 1 }],
        metrics: { inserted: 1, updated: 0, skipped: 0 }
      });

      const requests = Array.from({ length: 10 }, (_, i) =>
        postJson('/api/scrape', {
          curlCommand: `curl 'https://example.com/${i}'`,
          sourceName: `test-${i}`
        })
      );

      const results = await Promise.all(requests);
      results.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('handles concurrent requests with failures', async () => {
      scraper.fromCurl
        .mockResolvedValueOnce({
          source: 'test',
          url: 'https://example.com',
          cars: [{ vin: '1234567890ABCDEF01' }]
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          source: 'test',
          url: 'https://example.com',
          cars: [{ vin: '1234567890ABCDEF02' }]
        });

      dbInstance.saveInventory
        .mockResolvedValueOnce({
          records: [{ id: 1 }],
          metrics: { inserted: 1, updated: 0, skipped: 0 }
        })
        .mockResolvedValueOnce({
          records: [{ id: 2 }],
          metrics: { inserted: 1, updated: 0, skipped: 0 }
        });

      const requests = [
        postJson('/api/scrape', {
          curlCommand: "curl 'https://example.com/1'",
          sourceName: 'test-1'
        }),
        postJson('/api/scrape', {
          curlCommand: "curl 'https://example.com/2'",
          sourceName: 'test-2'
        }),
        postJson('/api/scrape', {
          curlCommand: "curl 'https://example.com/3'",
          sourceName: 'test-3'
        })
      ];

      const results = await Promise.allSettled(requests);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('Rate Limiting', () => {
    it('handles rate limit exceeded (429)', async () => {
      scraper.fromCurl.mockRejectedValue({
        response: { status: 429 },
        message: 'Rate limit exceeded'
      });

      const response = await postJson('/api/test', {
        curlCommand: "curl 'https://example.com'",
        sourceName: 'test'
      });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('recovers after rate limit', async () => {
      scraper.fromCurl
        .mockRejectedValueOnce({ response: { status: 429 }, message: 'Rate limit' })
        .mockResolvedValueOnce({
          source: 'test',
          url: 'https://example.com',
          cars: [{ vin: '1234567890ABCDEF01' }]
        });

      dbInstance.saveInventory.mockResolvedValue({
        records: [{ id: 1 }],
        metrics: { inserted: 1, updated: 0, skipped: 0 }
      });

      const firstResponse = await postJson('/api/scrape', {
        curlCommand: "curl 'https://example.com'",
        sourceName: 'test'
      });

      expect(firstResponse.status).toBe(500);

      const secondResponse = await postJson('/api/scrape', {
        curlCommand: "curl 'https://example.com'",
        sourceName: 'test'
      });

      expect(secondResponse.status).toBe(200);
    });
  });
});
