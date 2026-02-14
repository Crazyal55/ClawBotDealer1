const { Pool } = require('pg');

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function buildSslConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const enabled = toBool(process.env.DB_SSL, isProduction);
  if (!enabled) return undefined;

  return {
    rejectUnauthorized: toBool(process.env.DB_SSL_REJECT_UNAUTHORIZED, false)
  };
}

function getPoolConfig() {
  return {
    connectionString:
      process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/summit_auto',
    max: toInt(process.env.DB_POOL_MAX, 20),
    idleTimeoutMillis: toInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMillis: toInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 5000),
    maxUses: toInt(process.env.DB_POOL_MAX_USES, 0) || undefined,
    ssl: buildSslConfig()
  };
}

function createPool() {
  const pool = new Pool(getPoolConfig());

  pool.on('error', (err) => {
    console.error('[db:pool] Unexpected idle client error:', err.message);
  });

  return pool;
}

module.exports = {
  createPool,
  getPoolConfig
};
