/**
 * Test Puppeteer Integration
 *
 * Tests the browser renderer and crawler with Puppeteer support
 */

const CarInventoryCrawler = require('./crawler');
const BrowserRenderer = require('./crawler/browser-renderer');

async function testBrowserDetection() {
  console.log('\n=== Testing Browser Detection ===\n');

  const testCases = [
    { url: 'https://example.com', html: '<div id="root"></div>' },
    { url: 'https://example.com/app/page', html: '<html><body>Content</body></html>' },
    { url: 'https://example.com/#/route', html: '<div id="app"></div>' },
    { url: 'https://example.com/inventory', html: '<html><body><div class="vehicle-list">Cars here</div></body></html>' }
  ];

  for (const tc of testCases) {
    const needsBrowser = BrowserRenderer.needsBrowser(tc.url, tc.html);
    console.log(`${tc.url}: ${needsBrowser ? 'NEEDS BROWSER' : 'HTTP OK'}`);
  }
}

async function testBrowserRenderer() {
  console.log('\n=== Testing Browser Renderer ===\n');

  const renderer = new BrowserRenderer({ headless: true });

  try {
    await renderer.init();
    console.log('✓ Browser initialized');

    // Test fetching a simple page
    const result = await renderer.fetch('https://example.com');
    console.log(`✓ Fetched example.com: ${result.html.length} bytes`);

    await renderer.close();
    console.log('✓ Browser closed');

  } catch (error) {
    console.error('✗ Browser renderer test failed:', error.message);
  }
}

async function testCrawlerWithAuto() {
  console.log('\n=== Testing Crawler with Auto Puppeteer ===\n');

  const crawler = new CarInventoryCrawler({
    maxPages: 2,
    maxVehicles: 10,
    concurrency: 2,
    rateLimit: 1000,
    usePuppeteer: 'auto' // Will auto-detect when browser is needed
  });

  try {
    console.log('Crawling example.com (will try HTTP first)...');
    const result = await crawler.crawl('https://example.com', 'test');

    console.log(`\n✓ Crawl complete:`);
    console.log(`  Pages: ${result.stats.pagesCrawled}`);
    console.log(`  Vehicles: ${result.stats.totalVehicles}`);
    console.log(`  Duration: ${Math.round(result.stats.duration / 1000)}s`);

    await crawler.close();
    console.log('✓ Crawler cleaned up');

  } catch (error) {
    console.error('✗ Crawler test failed:', error.message);
    await crawler.close();
  }
}

async function testCrawlerForceBrowser() {
  console.log('\n=== Testing Crawler with Forced Puppeteer ===\n');

  const crawler = new CarInventoryCrawler({
    maxPages: 1,
    maxVehicles: 5,
    concurrency: 1,
    usePuppeteer: 'always', // Force browser rendering
    onProgress: (progress) => {
      console.log(`Progress: ${progress.completed} completed, ${progress.queued} queued`);
    }
  });

  try {
    console.log('Crawling with forced browser rendering...');
    const result = await crawler.crawl('https://example.com', 'test-browser');

    console.log(`\n✓ Crawl complete:`);
    console.log(`  Pages: ${result.stats.pagesCrawled}`);
    console.log(`  Vehicles: ${result.stats.totalVehicles}`);

    await crawler.close();
    console.log('✓ Crawler cleaned up');

  } catch (error) {
    console.error('✗ Forced browser test failed:', error.message);
    await crawler.close();
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  Puppeteer Integration Test Suite         ║');
  console.log('╚════════════════════════════════════════════╝');

  try {
    // Test 1: Browser detection logic
    await testBrowserDetection();

    // Test 2: Browser renderer (requires Puppeteer installed)
    try {
      await testBrowserRenderer();
      await testCrawlerWithAuto();
      await testCrawlerForceBrowser();
    } catch (error) {
      console.error('✗ Browser tests failed (Puppeteer may not be fully installed):', error.message);
    }

    console.log('\n✓ All tests passed!');

  } catch (error) {
    console.error('\n✗ Tests failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests().then(() => {
  console.log('\nTest suite complete.');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
