jest.mock('../../../db_pg', () =>
  jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    listRecentChatSessions: jest.fn().mockResolvedValue([]),
    createOrUpdateChatSession: jest.fn().mockResolvedValue({
      id: 10,
      session_key: 'demo',
      business: 'Summit Automotive Group',
      location: 'Denver'
    }),
    addChatMessage: jest.fn().mockResolvedValue({ id: 1 }),
    getPoolStats: jest.fn().mockReturnValue({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    close: jest.fn().mockResolvedValue(undefined),
    pool: {
      query: jest.fn().mockResolvedValue({ rows: [] })
    }
  }))
);

jest.mock('../../../scraper', () => ({
  fromCurl: jest.fn()
}));

const DatabasePG = require('../../../db_pg');
const { app, db } = require('../../../server_pg');

describe('Chat + DB Health API Endpoints', () => {
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
    dbInstance = db;
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  async function getJson(path) {
    const response = await fetch(`${baseUrl}${path}`);
    const body = await response.json();
    return { status: response.status, body };
  }

  async function postJson(path, payload) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    return { status: response.status, body };
  }

  it('GET /api/chat/sessions returns recent sessions', async () => {
    dbInstance.listRecentChatSessions.mockResolvedValueOnce([
      { id: 1, session_key: 'demo', message_count: '2' }
    ]);

    const response = await getJson('/api/chat/sessions?limit=5');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.sessions).toHaveLength(1);
    expect(dbInstance.listRecentChatSessions).toHaveBeenCalledWith(5);
  });

  it('POST /api/chat/sessions/:sessionKey/messages validates missing message as 400', async () => {
    const response = await postJson('/api/chat/sessions/demo/messages', {
      business: 'Summit Automotive Group',
      location: 'Denver'
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('message is required');
    expect(dbInstance.createOrUpdateChatSession).not.toHaveBeenCalled();
  });

  it('POST /api/chat/sessions/:sessionKey/messages stores transcript and returns reply', async () => {
    dbInstance.createOrUpdateChatSession.mockResolvedValueOnce({
      id: 15,
      session_key: 'demo',
      business: 'Summit Automotive Group',
      location: 'Denver'
    });

    const response = await postJson('/api/chat/sessions/demo/messages', {
      message: 'show me awd options',
      business: 'Summit Automotive Group',
      location: 'Denver'
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.session_key).toBe('demo');
    expect(response.body.data.reply.toLowerCase()).toContain('awd');
    expect(dbInstance.createOrUpdateChatSession).toHaveBeenCalledTimes(1);
    expect(dbInstance.addChatMessage).toHaveBeenCalledTimes(2);
  });

  it('GET /api/health/db returns 503 when required schema tables are missing', async () => {
    dbInstance.pool.query
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({ rows: [{ table_name: 'vehicles' }] });

    const response = await getJson('/api/health/db');

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Database schema incomplete');
    expect(response.body.missingTables).toEqual(
      expect.arrayContaining(['dealers', 'dealer_locations'])
    );
  });

  it('GET /api/health/db returns healthy when required schema is present', async () => {
    dbInstance.pool.query
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({
        rows: [
          { table_name: 'vehicles' },
          { table_name: 'dealers' },
          { table_name: 'dealer_locations' }
        ]
      });

    const response = await getJson('/api/health/db');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe('healthy');
    expect(response.body.pool).toBeDefined();
  });
});
