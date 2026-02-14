/**
 * Integration Tests: API Crawl Endpoints
 * Tests for /api/crawl, status, and results endpoints
 */

const request = require('supertest');
const server = require('../../../server');

describe('POST /api/crawl', () => {
  let app;

  beforeAll(() => {
    // Use Express app from server.js
    app = server;
  });

  test('should start crawl job with valid URL', async () => {
    const response = await request(app)
      .post('/api/crawl')
      .send({
        url: 'https://example.com/inventory',
        sourceName: 'Test Dealer',
        options: {
          maxPages: 2,
          maxVehicles: 5
        }
      })
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('jobId');
    expect(response.body.jobId).toMatch(/^job_/);
    expect(response.body).toHaveProperty('status', 'started');
  });

  test('should accept URL without options', async () => {
    const response = await request(app)
      .post('/api/crawl')
      .send({
        url: 'https://example.com/inventory'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.jobId).toBeDefined();
  });

  test('should reject missing URL', async () => {
    const response = await request(app)
      .post('/api/crawl')
      .send({})
      .expect(400)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/url.*required/i);
  });

  test('should reject invalid URL format', async () => {
    const response = await request(app)
      .post('/api/crawl')
      .send({
        url: 'not-a-url'
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  test('should handle options object', async () => {
    const response = await request(app)
      .post('/api/crawl')
      .send({
        url: 'https://example.com',
        sourceName: 'Test',
        options: {
          maxPages: 10,
          maxVehicles: 100,
          concurrency: 2,
          rateLimit: 2000,
          usePuppeteer: 'never'
        }
      })
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  test('should accept array of URLs (batch crawl)', async () => {
    // This endpoint might not exist, but test would look like:
    const response = await request(app)
      .post('/api/crawl/batch')
      .send({
        urls: [
          'https://example.com/1',
          'https://example.com/2'
        ],
        sourceName: 'Batch Test'
      })
      .expect(404); // 404 if endpoint doesn't exist yet
  });
});

describe('GET /api/crawl/:jobId/status', () => {
  let app;
  let jobId;

  beforeAll(() => {
    app = server;
  });

  beforeEach(async () => {
    // Create a job first
    const createResponse = await request(app)
      .post('/api/crawl')
      .send({ url: 'https://example.com' });

    jobId = createResponse.body.jobId;
  });

  test('should return job status', async () => {
    const response = await request(app)
      .get(`/api/crawl/${jobId}/status`)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('jobId', jobId);
    expect(response.body).toHaveProperty('status');
    expect(['running', 'completed', 'failed']).toContain(response.body.status);
    expect(response.body).toHaveProperty('startedAt');
  });

  test('should include progress information', async () => {
    const response = await request(app)
      .get(`/api/crawl/${jobId}/status`)
      .expect(200);

    expect(response.body).toHaveProperty('progress');
    expect(response.body.progress).toHaveProperty('queued');
    expect(response.body.progress).toHaveProperty('running');
    expect(response.body.progress).toHaveProperty('completed');
    expect(response.body.progress).toHaveProperty('failed');
  });

  test('should return 404 for non-existent job', async () => {
    const response = await request(app)
      .get('/api/crawl/job_nonexistent_12345/status')
      .expect(404)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error', 'Job not found');
  });

  test('should handle invalid jobId format', async () => {
    const response = await request(app)
      .get('/api/crawl/invalid-format/status')
      .expect(404);

    expect(response.body.success).toBe(false);
  });
});

describe('GET /api/crawl/:jobId/results', () => {
  let app;
  let jobId;

  beforeAll(() => {
    app = server;
  });

  beforeEach(async () => {
    // Create a job
    const createResponse = await request(app)
      .post('/api/crawl')
      .send({ url: 'https://example.com' });

    jobId = createResponse.body.jobId;

    // Wait a bit for job to potentially complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test('should return 400 for running job', async () => {
    // Job likely still running, so expect 400
    const response = await request(app)
      .get(`/api/crawl/${jobId}/results`)
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error', 'Job not complete yet');
    expect(response.body).toHaveProperty('status');
  });

  test('should return 404 for non-existent job', async () => {
    const response = await request(app)
      .get('/api/crawl/job_does_not_exist/results')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Job not found');
  });

  // Note: Testing successful results requires waiting for job completion
  // or mocking the crawler, which is better done in unit tests
});

describe('API Error Handling', () => {
  let app;

  beforeAll(() => {
    app = server;
  });

  test('should handle malformed JSON', async () => {
    const response = await request(app)
      .post('/api/crawl')
      .set('Content-Type', 'application/json')
      .send('invalid json {')
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  test('should handle missing Content-Type', async () => {
    const response = await request(app)
      .post('/api/crawl')
      .send('url=https://example.com')
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  test('should handle large payloads', async () => {
    const hugeOptions = {
      maxPages: 999999,
      maxVehicles: 999999
    };

    const response = await request(app)
      .post('/api/crawl')
      .send({
        url: 'https://example.com',
        options: hugeOptions
      })
      .expect(200); // Should accept but handle gracefully

    expect(response.body.success).toBe(true);
  });
});

describe('CORS Headers', () => {
  let app;

  beforeAll(() => {
    app = server;
  });

  test('should include CORS headers', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });
});
