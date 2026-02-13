#!/usr/bin/env node

/**
 * Test to verify the /api/crawl endpoint works
 */

const express = require('express');
const CarInventoryCrawler = require('./crawler');
const Database = require('./db');

const app = express();
app.use(express.json());
const PORT = 3001;

// Test the exact route definition
app.post('/api/crawl', async (req, res) => {
  console.log('[TEST] /api/crawl called!');
  console.log('[TEST] Body:', req.body);

  const { url, sourceName, options = {} } = req.body;

  // Validate URL
  if (!url) {
    console.log('[TEST] URL missing');
    return res.status(400).json({
      success: false,
      error: 'URL is required'
    });
  }

  console.log('[TEST] Starting crawl for:', url);

  try {
    const crawler = new CarInventoryCrawler({
      maxPages: options.maxPages || 2,
      maxVehicles: options.maxVehicles || 10,
      concurrency: 2,
      rateLimit: 1000,
      onProgress: (progress) => {
        console.log('[TEST] Progress:', JSON.stringify(progress));
      }
    });

    // Run crawl
    const result = await crawler.crawl(url, sourceName || 'test-endpoint');

    console.log('[TEST] Crawl complete:', result);

    res.json({
      success: true,
      message: 'Crawl test complete',
      result: result
    });

  } catch (error) {
    console.error('[TEST] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`[TEST] Test server listening on port ${PORT}`);
  console.log(`[TEST] Test with: curl -X POST http://localhost:${PORT}/api/crawl -H "Content-Type: application/json" -d '{"url":"https://example.com"}'`);
});

// Keep process running
console.log('[TEST] Server ready, press Ctrl+C to exit');
