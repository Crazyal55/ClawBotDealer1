# Test Suite Documentation

## Overview

This directory contains the automated test suite for the ClawBot Dealer crawler system. Tests are organized by type (unit, integration, e2e) and cover all major components.

## Test Structure

```
tests/
├── setup.js              # Global test setup (DB, fixtures)
├── teardown.js           # Global cleanup
├── fixtures/             # Test data (HTML, JSON)
│   ├── html/            # Sample HTML from real sites
│   └── json/           # Sample vehicle data
├── unit/                # Isolated module tests
│   └── crawler/        # Crawler module tests
├── integration/          # Multi-module tests
│   └── api/           # API endpoint tests
└── e2e/                # Full system tests
    └── real-crawler.test.js
```

## Running Tests

### Prerequisites

1. **Install Jest** (already in package.json devDependencies):
```bash
npm install
```

2. **Ensure PostgreSQL is running** (for unit/integration tests):
```bash
# Windows
netstat -ano | findstr :5432

# Or check if PostgreSQL service is running
# The tests will use a test database: clawbot_test
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only unit tests (fast)
npm run test:unit

# Run only integration tests
npm run test:integration

# Run E2E tests (slow, real HTTP requests)
npm run test:e2e

# Run tests in CI mode (parallel, coverage)
npm run test:ci
```

## Test Categories

### 1. Unit Tests (`tests/unit/`)

**Purpose**: Test individual modules in isolation

**Modules tested**:
- `url-discoverer.test.js` - URL discovery, pagination detection
- `request-queue.test.js` - Queue operations, concurrency, retries
- `db_pg.test.js` - Database operations, normalization

**Characteristics**:
- Fast (< 100ms per test)
- No external dependencies (mocked)
- Can run without database

**Example**:
```bash
npm run test:unit -- url-discoverer
```

### 2. Integration Tests (`tests/integration/`)

**Purpose**: Test multiple modules working together

**Modules tested**:
- API endpoints with real Express server
- Database integration
- Crawler flow with mocked HTTP

**Characteristics**:
- Medium speed (100ms - 2s per test)
- Some external dependencies (PostgreSQL, Express)
- Real HTTP responses (mocked)

**Example**:
```bash
npm run test:integration -- api/crawl-endpoint
```

### 3. E2E Tests (`tests/e2e/`)

**Purpose**: Test complete system with real HTTP requests

**Tests**:
- Real website crawling (example.com, Cars.com)
- Full crawler flow with browser

**Characteristics**:
- Slow (2s - 60s per test)
- Real HTTP requests
- May require network access
- Marked with `test.skip` by default (manual only)

**Example**:
```bash
# Run E2E tests (only if needed)
npm run test:e2e

# Run specific E2E test
RUN_REAL_SITE_TESTS=true npm run test:e2e
```

## Test Fixtures

### HTML Fixtures (`tests/fixtures/html/`)

Real HTML from dealership sites for testing:

- `cars.com-srp.html` - Search results page
- `cars.com-vdp.html` - Vehicle detail page
- `autotrader-vdp.html` - Autotrader VDP
- `spa-empty.html` - Empty SPA (for JS detection)

### JSON Fixtures (`tests/fixtures/json/`)

Sample vehicle data for testing:

- `sample-vehicles.json` - Valid and invalid vehicle records

## Coverage Goals

Current targets in `jest.config.js`:

```javascript
{
  global: {
    branches: 70,
    functions: 75,
    lines: 75,
    statements: 75
  },
  './crawler/': {
    branches: 80,
    functions: 85,
    lines: 85,
    statements: 85
  }
}
```

View coverage:
```bash
npm run test:coverage
open coverage/index.html
```

## CI/CD Integration

Tests run automatically in GitHub Actions (`.github/workflows/test.yml`):

- On every push to main/master
- On every pull request
- Uses PostgreSQL service container
- Uploads coverage to Codecov

## Debugging Tests

### Run a single test file:
```bash
npm test url-discoverer.test.js
```

### Run a specific test:
```bash
npm test -t "should find VDP links"
```

### Debug with console output:
```javascript
test('my test', () => {
  global.restoreConsole(); // Enable console.log
  console.log('Debug info');
  expect(true).toBe(true);
});
```

### Increase timeout for slow tests:
```javascript
test('slow test', async () => {
  // ...test code
}, 60000); // 60s timeout
```

## Writing New Tests

1. **Unit test template**:
```javascript
describe('ModuleName', () => {
  let module;

  beforeEach(() => {
    module = require('../../path/to/module');
  });

  test('should do something', () => {
    const result = module.doSomething();
    expect(result).toBe('expected');
  });
});
```

2. **Integration test template**:
```javascript
const request = require('supertest');
const app = require('../../server');

describe('API Endpoint', () => {
  test('should return 200', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);

    expect(response.body).toHaveProperty('success');
  });
});
```

## Troubleshooting

### Tests fail with "ECONNREFUSED"

- Ensure PostgreSQL is running on port 5432
- Check TEST_DATABASE_URL environment variable

### Tests fail with "Cannot find module"

- Run `npm install` to install dependencies
- Check that `NODE_ENV` is not set to `production`

### Puppeteer tests fail

- Puppeteer tests are skipped by default
- Run with: `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm test`
- Or skip Puppeteer tests with `test.skip()`

### Database locked errors

```bash
# Stop PostgreSQL service
# Delete test database
# Restart service
# Or use a different test database name
```

## Continuous Improvement

Goals for test coverage:

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E tests working (manual)
- [ ] 75%+ global coverage
- [ ] CI/CD pipeline passing
- [ ] Coverage badge in README

## Contributing

When adding new features:

1. Write tests first (TDD) or alongside code
2. Ensure all tests pass before committing
3. Maintain or improve coverage percentage
4. Add fixtures if testing new HTML/JSON patterns
5. Update this README with new test information

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/node-testing-best-practices)
