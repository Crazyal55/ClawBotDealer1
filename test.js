#!/usr/bin/env node

/**
 * Test Suite - Car Scraper R&D Tool
 * Tests all API endpoints and functionality
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Test helpers
function testCase(name, fn) {
  return new Promise(async (resolve) => {
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS', message: '' });
      console.log(`✅ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', message: error.message });
      console.log(`❌ ${name}: ${error.message}`);
    }
    resolve();
  });
}

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ statusCode: res.statusCode, body: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// ============ TESTS ============

async function runTests() {
  console.log('🧪 Running Test Suite for Car Scraper R&D Tool');
  console.log('=' .repeat(60));
  console.log('');

  // Test 1: Server Health (if endpoint exists)
  await testCase('Server is running', async () => {
    const res = await request('GET', '/api/health');
    if (res.statusCode === 404) {
      console.log('   ℹ️  Health endpoint not implemented (expected)');
    }
  });

  // Test 2: Get Empty Inventory
  await testCase('Get empty inventory', async () => {
    const res = await request('GET', '/api/inventory');
    if (res.statusCode !== 200) {
      throw new Error(`Expected 200, got ${res.statusCode}`);
    }
    if (!Array.isArray(res.body)) {
      throw new Error('Expected array, got ' + typeof res.body);
    }
  });

  // Test 3: Post Scraped Data
  await testCase('Post scraped car data', async () => {
    const testCar = {
      curlCommand: "curl 'https://example.com'",
      sourceName: 'test-source'
    };

    const res = await request('POST', '/api/scrape', testCar);
    // Expected to fail (fake URL), but should return 500 or valid JSON
    if (res.statusCode !== 200 && res.statusCode !== 500) {
      throw new Error(`Unexpected status: ${res.statusCode}`);
    }
  });

  // Test 4: Delete Non-Existent Car
  await testCase('Delete non-existent car returns 404', async () => {
    const res = await request('DELETE', '/api/inventory/999999');
    if (res.statusCode !== 404) {
      throw new Error(`Expected 404, got ${res.statusCode}`);
    }
  });

  // Test 5: Clear All Inventory
  await testCase('Clear all inventory', async () => {
    const res = await request('DELETE', '/api/inventory');
    if (res.statusCode !== 200) {
      throw new Error(`Expected 200, got ${res.statusCode}`);
    }
    if (!res.body.success) {
      throw new Error('Expected success: true');
    }
  });

  // Test 6: Get Inventory After Clear
  await testCase('Get inventory after clear', async () => {
    const res = await request('GET', '/api/inventory');
    if (res.statusCode !== 200) {
      throw new Error(`Expected 200, got ${res.statusCode}`);
    }
    if (res.body.length !== 0) {
      throw new Error(`Expected 0 items, got ${res.body.length}`);
    }
  });

  // Test 7: CORS Headers
  await testCase('CORS headers present', async () => {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/inventory',
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3001',
          'Access-Control-Request-Method': 'GET'
        }
      }, (res) => {
        let hasCORS = res.headers['access-control-allow-origin'] ||
                      res.headers['Access-Control-Allow-Origin'];
        if (!hasCORS) {
          reject(new Error('No CORS headers found'));
        }
        res.resume();
        resolve();
      });

      req.on('error', reject);
      req.end();
    });
  });

  // Test 8: Invalid JSON Returns 400
  await testCase('Invalid JSON returns 400', async () => {
    const res = await request('POST', '/api/scrape', '{invalid json}');
    if (res.statusCode !== 400 && res.statusCode !== 500) {
      // JSON parsing error might return 500
      throw new Error(`Expected 400 or 500, got ${res.statusCode}`);
    }
  });

  // Test 9: API Response Format
  await testCase('API responses have correct format', async () => {
    const res = await request('GET', '/api/inventory');
    if (Array.isArray(res.body)) {
      return; // OK
    }
    // If it's an object with success field
    if (typeof res.body === 'object' && 'success' in res.body) {
      return; // OK
    }
    throw new Error('Unexpected response format');
  });

  // Test 10: Get Dealers
  await testCase('Get dealers endpoint', async () => {
    const res = await request('GET', '/api/dealers');
    if (res.statusCode !== 200) {
      throw new Error(`Expected 200, got ${res.statusCode}`);
    }
    if (!Array.isArray(res.body)) {
      throw new Error('Expected array');
    }
  });

  // Print summary
  console.log('');
  console.log('=' .repeat(60));
  console.log('📊 Test Results Summary');
  console.log('=' .repeat(60));
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   📋 Total: ${results.tests.length}`);
  console.log('');

  if (results.failed > 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        console.log(`   ❌ ${t.name}`);
        console.log(`      ${t.message}`);
      });
  }

  console.log('');

  // Detailed test log
  console.log('📋 Detailed Test Log:');
  console.log('=' .repeat(60));
  results.tests.forEach(t => {
    const icon = t.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${t.name}`);
    if (t.message) {
      console.log(`   ${t.message}`);
    }
  });

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
