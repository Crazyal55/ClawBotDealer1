const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/summit_auto';
const sqlPath = path.join(__dirname, '..', 'docs', 'placeholder_data.sql');

async function main() {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query(sql);
    console.log('[db:init] PostgreSQL schema + seed loaded from docs/placeholder_data.sql');
  } catch (error) {
    console.error('[db:init] failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
