const { spawn } = require('child_process');

const SERVER_URL = 'http://127.0.0.1:3000/health';
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
        if (body && body.status) {
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
  const server = spawn(process.execPath, ['server.js'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  server.stdout.on('data', (chunk) => process.stdout.write(`[server] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[server] ${chunk}`));

  try {
    const body = await waitForHealth();
    console.log(`[smoke] /health ok: ${JSON.stringify(body)}`);
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
