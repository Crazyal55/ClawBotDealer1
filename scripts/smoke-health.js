const { spawn } = require('child_process');

const SERVER_ENTRY = process.env.SERVER_ENTRY || 'server_pg.js';
const SERVER_PORT = process.env.SERVER_PORT || '3000';
const SERVER_URL = process.env.HEALTH_URL || `http://127.0.0.1:${SERVER_PORT}/api/health/db`;
const START_TIMEOUT_MS = 20000;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth() {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < START_TIMEOUT_MS) {
    try {
      const response = await fetch(SERVER_URL);
      if (response.ok) {
        const body = await response.json();
        if (body && (body.status || body.success !== undefined)) {
          return body;
        }
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(500);
  }

  throw new Error(
    `Health check did not pass within ${START_TIMEOUT_MS}ms: ${lastError ? lastError.message : 'timeout'}`
  );
}

async function main() {
  const server = spawn(process.execPath, [SERVER_ENTRY], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: process.env.PORT || SERVER_PORT
    }
  });

  server.stdout.on('data', (chunk) => process.stdout.write(`[server] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[server] ${chunk}`));

  try {
    const body = await waitForHealth();
    console.log(`[smoke] health ok: ${JSON.stringify(body)}`);
  } finally {
    if (!server.killed) {
      server.kill('SIGTERM');
    }
  }
}

main().catch((error) => {
  console.error('[smoke] failed:', error.message);
  process.exitCode = 1;
});
