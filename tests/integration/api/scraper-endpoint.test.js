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

describe('Scraper API Endpoints', () => {
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

  it('POST /api/test returns extracted cars without saving', async () => {
    scraper.fromCurl.mockResolvedValue({
      source: 'test-source',
      url: 'https://example.com/inventory',
      cars: [{ vin: '1HGCM82633A004352' }]
    });

    const response = await postJson('/api/test', {
      curlCommand: "curl 'https://example.com/inventory'",
      sourceName: 'test-source'
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(dbInstance.saveInventory).not.toHaveBeenCalled();
  });

  it('POST /api/scrape saves cars and returns metrics', async () => {
    scraper.fromCurl.mockResolvedValue({
      source: 'cars.com',
      url: 'https://example.com/inventory',
      cars: [{ vin: '1HGCM82633A004352' }]
    });

    const response = await postJson('/api/scrape', {
      curlCommand: "curl 'https://example.com/inventory'",
      sourceName: 'cars.com'
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.metrics).toEqual({ inserted: 1, updated: 0, skipped: 0 });
    expect(dbInstance.saveInventory).toHaveBeenCalledTimes(1);
  });

  it('POST /api/scrape/batch validates empty input as 400', async () => {
    const response = await postJson('/api/scrape/batch', { curlCommands: [] });
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('curlCommands must be a non-empty array');
  });

  it('POST /api/scrape/batch aggregates metrics across scrapes', async () => {
    scraper.fromCurl
      .mockResolvedValueOnce({
        source: 'src-a',
        url: 'https://example.com/a',
        cars: [{ vin: 'A' }]
      })
      .mockResolvedValueOnce({
        source: 'src-b',
        url: 'https://example.com/b',
        cars: [{ vin: 'B' }, { vin: 'C' }]
      });

    dbInstance.saveInventory
      .mockResolvedValueOnce({
        records: [{ id: 1 }],
        metrics: { inserted: 1, updated: 0, skipped: 0 }
      })
      .mockResolvedValueOnce({
        records: [{ id: 2 }, { id: 3 }],
        metrics: { inserted: 1, updated: 1, skipped: 0 }
      });

    const response = await postJson('/api/scrape/batch', {
      curlCommands: ["curl 'https://example.com/a'", "curl 'https://example.com/b'"],
      sourceName: 'batch-source'
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.metrics).toEqual({ inserted: 2, updated: 1, skipped: 0 });
    expect(dbInstance.saveInventory).toHaveBeenCalledTimes(2);
  });
});
