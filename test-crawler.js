#!/usr/bin/env node

/**
 * Test script for the new crawler functionality
 */

const CarInventoryCrawler = require('./crawler');

async function testCrawler() {
  console.log('=== Crawler Test ===\n');

  // Test with example.com (will fail, but shows the flow)
  const testUrl = 'https://example.com';
  console.log(`Testing with URL: ${testUrl}`);

  const crawler = new CarInventoryCrawler({
    maxPages: 2,
    maxVehicles: 10,
    concurrency: 2,
    rateLimit: 1000,
    onProgress: (progress) => {
      console.log(`[Progress] Queued: ${progress.queued}, Running: ${progress.running}, Completed: ${progress.completed}, Failed: ${progress.failed}`);
    }
  });

  try {
    const result = await crawler.crawl(testUrl, 'test-crawler');

    console.log('\n=== Crawl Complete ===');
    console.log(`Vehicles found: ${result.vehicles.length}`);
    console.log(`Pages crawled: ${result.stats.pagesCrawled}`);
    console.log(`VDP pages: ${result.stats.vdpPages}`);
    console.log(`SRP pages: ${result.stats.srpPages}`);
    console.log(`Duration: ${Math.round(result.stats.duration / 1000)}s`);

    if (result.vehicles.length > 0) {
      console.log('\n=== Sample Vehicle ===');
      const sample = result.vehicles[0];
      console.log(JSON.stringify(sample, null, 2));
    }

  } catch (error) {
    console.error('\n=== Crawl Failed ===');
    console.error(error.message);
    console.error(error.stack);
  }
}

testCrawler().then(() => {
  console.log('\nTest complete');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
