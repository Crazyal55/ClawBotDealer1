/**
 * Mock HTTP utilities for testing
 * Provides helpers to mock HTTP responses and external APIs
 */

const nock = require('nock');

/**
 * Mock a Cars.com SRP (Search Results Page) response
 * @param {string} baseUrl - Base URL to mock
 * @param {number} statusCode - HTTP status code
 */
function mockCarsSRP(baseUrl = 'https://www.cars.com', statusCode = 200) {
  const fs = require('fs');
  const path = require('path');

  const html = fs.readFileSync(
    path.join(__dirname, '../fixtures/html/cars.com-srp.html'),
    'utf8'
  );

  return nock(baseUrl)
    .get('/vehicles/inventory/')
    .reply(statusCode, html, {
      'Content-Type': 'text/html'
    });
}

/**
 * Mock a Cars.com VDP (Vehicle Detail Page) response
 * @param {string} vin - Vehicle VIN (optional, used in URL)
 * @param {number} statusCode - HTTP status code
 */
function mockCarsVDP(vin = '4T1BF1FK5DU123456', statusCode = 200) {
  const fs = require('fs');
  const path = require('path');

  const html = fs.readFileSync(
    path.join(__dirname, '../fixtures/html/cars.com-vdp.html'),
    'utf8'
  );

  return nock('https://www.cars.com')
    .get(`/vehicledetails/detail-${vin}/`)
    .reply(statusCode, html, {
      'Content-Type': 'text/html'
    });
}

/**
 * Mock an Autotrader VDP response
 * @param {number} statusCode - HTTP status code
 */
function mockAutotraderVDP(statusCode = 200) {
  const fs = require('fs');
  const path = require('path');

  const html = fs.readFileSync(
    path.join(__dirname, '../fixtures/html/autotrader-vdp.html'),
    'utf8'
  );

  return nock('https://www.autotrader.com')
    .get('/cars-for-sale/vehicledetails.html')
    .reply(statusCode, html, {
      'Content-Type': 'text/html'
    });
}

/**
 * Mock a generic dealership SRP
 * @param {string} baseUrl - Base URL
 * @param {string} path - Path to inventory
 * @param {number} vehicleCount - Number of vehicles to mock
 */
function mockGenericSRP(baseUrl = 'https://example.com', path = '/inventory', vehicleCount = 10) {
  let html = '<html><body><div class="inventory">';

  for (let i = 1; i <= vehicleCount; i++) {
    html += `
      <a href="/vehicle/${i}" class="vehicle-card">
        <h3>Vehicle ${i}</h3>
        <span class="price">$${i * 5000}</span>
      </a>
    `;
  }

  html += '</div></body></html>';

  return nock(baseUrl)
    .get(path)
    .reply(200, html, {
      'Content-Type': 'text/html'
    });
}

/**
 * Mock a failed HTTP response
 * @param {string} url - URL to mock
 * @param {number} statusCode - HTTP error status
 * @param {string} message - Error message
 */
function mockHTTPError(url, statusCode = 500, message = 'Internal Server Error') {
  return nock(url)
    .get(/.*/)
    .reply(statusCode, message);
}

/**
 * Mock a rate limit response (429)
 * @param {string} baseUrl - Base URL
 * @param {number} retryAfter - Retry-After header value (seconds)
 */
function mockRateLimit(baseUrl = 'https://example.com', retryAfter = 60) {
  return nock(baseUrl)
    .get(/.*/)
    .reply(429, 'Too Many Requests', {
      'Retry-After': retryAfter.toString(),
      'Content-Type': 'text/plain'
    });
}

/**
 * Mock a pagination response
 * @param {string} baseUrl - Base URL
 * @param {number} pageNum - Page number to mock
 * @param {boolean} hasNext - Whether there's a next page
 */
function mockPagination(baseUrl = 'https://example.com', pageNum = 1, hasNext = true) {
  let html = `
    <html>
      <body>
        <div class="inventory">
          <a href="/vehicle/1">Car 1</a>
          <a href="/vehicle/2">Car 2</a>
        </div>
        <nav class="pagination">
          <span>Page ${pageNum}</span>
  `;

  if (hasNext) {
    html += `<a href="/inventory?page=${pageNum + 1}" class="next">Next</a>`;
  }

  html += '</nav></body></html>';

  return nock(baseUrl)
    .get(`/inventory?page=${pageNum}`)
    .reply(200, html, {
      'Content-Type': 'text/html'
    });
}

/**
 * Mock an empty page (no vehicles)
 * @param {string} url - URL to mock
 */
function mockEmptyPage(url = 'https://example.com/empty') {
  return nock(url)
    .get(/.*/)
    .reply(200, '<html><body>No vehicles here</body></html>', {
      'Content-Type': 'text/html'
    });
}

/**
 * Mock a JavaScript-heavy SPA (empty before rendering)
 * @param {string} url - URL to mock
 */
function mockSPA(url = 'https://example.com/app') {
  const fs = require('fs');
  const path = require('path');

  const html = fs.readFileSync(
    path.join(__dirname, '../fixtures/html/spa-empty.html'),
    'utf8'
  );

  return nock(url)
    .get(/.*/)
    .reply(200, html, {
      'Content-Type': 'text/html'
    });
}

/**
 * Clean up all nock mocks
 */
function cleanAll() {
  nock.cleanAll();
}

/**
 * Disable network requests (ensures all requests are mocked)
 */
function disableNetConnect() {
  nock.disableNetConnect();
}

/**
 * Enable network requests
 */
function enableNetConnect() {
  nock.enableNetConnect();
}

/**
 * Verify all mocks were called
 * @param {boolean} allowUnmocked - Whether to allow unmocked requests
 */
function verifyMocks(allowUnmocked = false) {
  if (!allowUnmocked) {
    const pending = nock.pendingMocks();
    if (pending.length > 0) {
      throw new Error(`Pending mocks: ${JSON.stringify(pending)}`);
    }
  }
}

module.exports = {
  mockCarsSRP,
  mockCarsVDP,
  mockAutotraderVDP,
  mockGenericSRP,
  mockHTTPError,
  mockRateLimit,
  mockPagination,
  mockEmptyPage,
  mockSPA,
  cleanAll,
  disableNetConnect,
  enableNetConnect,
  verifyMocks
};
