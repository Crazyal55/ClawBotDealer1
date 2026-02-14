/**
 * Real Dealership Testing Script
 *
 * Tests the scraper with real dealership inventory pages
 * to validate data extraction, quality scoring, and error handling.
 *
 * Run: node car-scraper/test-real-dealership.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000';

// Real dealership curl commands with realistic User-Agent headers
const dealershipTests = [
  {
    name: 'Dellenbach Chevrolet (Fort Collins, CO)',
    platform: 'DealerOn (DSP)',
    url: 'https://www.dellenbachchevrolet.com/searchnew.aspx',
    curl: `curl 'https://www.dellenbachchevrolet.com/searchnew.aspx' \\
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' \\
  -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8' \\
  -H 'Accept-Language: en-US,en;q=0.9' \\
  -H 'Accept-Encoding: gzip, deflate, br' \\
  -H 'Connection: keep-alive' \\
  -H 'Upgrade-Insecure-Requests: 1' \\
  -H 'Sec-Fetch-Dest: document' \\
  -H 'Sec-Fetch-Mode: navigate' \\
  -H 'Sec-Fetch-Site: none' \\
  -H 'Cache-Control: max-age=0' \\
  --compressed`
  },
  {
    name: 'Burlington Ford (Burlington, CO)',
    platform: 'DealerOn (DSP)',
    url: 'https://www.burlington-limonford.com/searchnew.aspx',
    curl: `curl 'https://www.burlington-limonford.com/searchnew.aspx' \\
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' \\
  -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8' \\
  -H 'Accept-Language: en-US,en;q=0.9' \\
  -H 'Accept-Encoding: gzip, deflate, br' \\
  -H 'Connection: keep-alive' \\
  -H 'Upgrade-Insecure-Requests: 1' \\
  -H 'Sec-Fetch-Dest: document' \\
  -H 'Sec-Fetch-Mode: navigate' \\
  -H 'Sec-Fetch-Site: none' \\
  -H 'Cache-Control: max-age=0' \\
  --compressed`
  }
];

/**
 * Test the /api/scrape endpoint
 */
async function testScrapeEndpoint(test) {
  console.log(`\n🔍 Testing /api/scrape for ${test.name}`);
  console.log(`   Platform: ${test.platform}`);
  console.log(`   URL: ${test.url}`);

  try {
    const startTime = Date.now();

    const response = await axios.post(`${API_BASE}/api/scrape`, {
      curlCommand: test.curl,
      sourceName: test.name
    });

    const duration = Date.now() - startTime;

    console.log(`\n✅ SUCCESS (${duration}ms)`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Vehicles Extracted: ${response.data.cars?.length || 0}`);
    console.log(`   Source: ${response.data.source}`);
    console.log(`   URL: ${response.data.url}`);

    // Quality score analysis
    if (response.data.cars && response.data.cars.length > 0) {
      const avgQuality = response.data.cars.reduce((sum, car) => sum + (car.qualityScore || 0), 0) / response.data.cars.length;
      const highQuality = response.data.cars.filter(car => (car.qualityScore || 0) >= 80).length;
      const lowQuality = response.data.cars.filter(car => (car.qualityScore || 0) < 50).length;

      console.log(`\n📊 Quality Analysis:`);
      console.log(`   Average Quality Score: ${avgQuality.toFixed(1)}%`);
      console.log(`   High Quality (≥80%): ${highQuality}/${response.data.cars.length}`);
      console.log(`   Low Quality (<50%): ${lowQuality}/${response.data.cars.length}`);

      // Sample vehicle
      const sampleCar = response.data.cars[0];
      console.log(`\n🚗 Sample Vehicle:`);
      console.log(`   VIN: ${sampleCar.vin || 'N/A'}`);
      console.log(`   Year/Make/Model: ${sampleCar.year || 'N/A'} ${sampleCar.make || 'N/A'} ${sampleCar.model || 'N/A'}`);
      console.log(`   Price: $${(sampleCar.price || 0).toLocaleString()}`);
      console.log(`   Mileage: ${(sampleCar.mileage || 0).toLocaleString()}`);
      console.log(`   Quality Score: ${sampleCar.qualityScore || 0}%`);
      console.log(`   Flags: ${sampleCar.flags ? sampleCar.flags.join(', ') : 'None'}`);
    } else {
      console.log(`\n⚠️  WARNING: No vehicles extracted!`);
      console.log(`   This suggests the scraper may not support this platform's HTML structure.`);
    }

    return {
      success: true,
      duration,
      vehicles: response.data.cars?.length || 0,
      avgQuality: response.data.cars ?
        response.data.cars.reduce((sum, car) => sum + (car.qualityScore || 0), 0) / response.data.cars.length : 0,
      data: response.data
    };

  } catch (error) {
    const duration = Date.now() - Date.now(); // Approximate

    console.log(`\n❌ FAILED`);
    console.log(`   Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    if (error.code) {
      console.log(`   Code: ${error.code}`);
    }

    return {
      success: false,
      duration,
      error: error.message,
      vehicles: 0,
      avgQuality: 0
    };
  }
}

/**
 * Test the /api/test endpoint (diagnostics)
 */
async function testDiagnosticsEndpoint(test) {
  console.log(`\n🔧 Testing /api/test for ${test.name}`);

  try {
    const response = await axios.post(`${API_BASE}/api/test`, {
      curlCommand: test.curl,
      sourceName: test.name
    });

    console.log(`\n✅ Diagnostics Complete`);
    console.log(`   Status: ${response.status}`);

    if (response.data.htmlLength) {
      console.log(`   HTML Size: ${response.data.htmlLength} bytes`);
    }
    if (response.data.loadTime) {
      console.log(`   Load Time: ${response.data.loadTime}ms`);
    }
    if (response.data.platformDetected) {
      console.log(`   Platform: ${response.data.platformDetected}`);
    }

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.log(`\n❌ Diagnostics Failed`);
    console.log(`   Error: ${error.message}`);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Real Dealership Scraper Testing Suite                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Verify server is running
  try {
    await axios.get(API_BASE);
    console.log('\n✅ Server is running at localhost:3000');
  } catch (error) {
    console.error('\n❌ ERROR: Server is not running at localhost:3000');
    console.error('   Start the server with: npm start');
    process.exit(1);
  }

  const results = [];

  // Test each dealership
  for (const test of dealershipTests) {
    console.log('\n' + '═'.repeat(60));
    console.log(`  Testing: ${test.name}`);
    console.log('═'.repeat(60));

    // Run diagnostics first
    const diagnostics = await testDiagnosticsEndpoint(test);

    // Then test scraping
    const scrapeResult = await testScrapeEndpoint(test);

    results.push({
      name: test.name,
      platform: test.platform,
      url: test.url,
      diagnostics,
      scrape: scrapeResult
    });

    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log('\n' + '╔════════════════════════════════════════════════════════════╗');
  console.log('║     Test Summary                                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  let totalVehicles = 0;
  let successfulTests = 0;

  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name}`);
    console.log(`   Platform: ${result.platform}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Status: ${result.scrape.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`   Vehicles Extracted: ${result.scrape.vehicles}`);
    if (result.scrape.avgQuality > 0) {
      console.log(`   Avg Quality: ${result.scrape.avgQuality.toFixed(1)}%`);
    }
    if (result.scrape.error) {
      console.log(`   Error: ${result.scrape.error}`);
    }

    totalVehicles += result.scrape.vehicles;
    if (result.scrape.success) successfulTests++;
  });

  console.log('\n' + '─'.repeat(60));
  console.log(`Total Tests: ${results.length}`);
  console.log(`Successful: ${successfulTests}`);
  console.log(`Failed: ${results.length - successfulTests}`);
  console.log(`Total Vehicles Extracted: ${totalVehicles}`);
  console.log('─'.repeat(60));

  // Overall assessment
  console.log('\n📋 Overall Assessment:');
  if (successfulTests === 0) {
    console.log('   ⚠️  CRITICAL: All tests failed. The scraper may need browser automation');
    console.log('   (Puppeteer) for JavaScript-heavy dealership platforms.');
    console.log('   RECOMMENDATION: Implement dynamic content rendering.');
  } else if (totalVehicles === 0) {
    console.log('   ⚠️  WARNING: Tests ran but no vehicles were extracted.');
    console.log('   This suggests HTML structure mismatch or JavaScript rendering required.');
    console.log('   RECOMMENDATION: Inspect HTML structure and implement platform-specific parsers.');
  } else {
    console.log('   ✅ Good: At least one platform is working!');
    console.log('   RECOMMENDATION: Expand support to other platforms.');
  }

  console.log('\n✅ Testing complete!');
  console.log('\nNext steps:');
  console.log('1. Review detailed results above');
  console.log('2. Check REAL_DEALERSHIP_TEST.md for detailed documentation');
  console.log('3. Implement improvements based on findings');
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
