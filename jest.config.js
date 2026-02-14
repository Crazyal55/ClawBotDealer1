module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directory for tests
  roots: ['<rootDir>/tests'],

  // Test file patterns
  testMatch: [
    '**/*.test.js',
    '**/*.spec.js'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  globalTeardown: '<rootDir>/tests/teardown.js',

  // Coverage configuration
  collectCoverageFrom: [
    'crawler/**/*.js',
    'server.js',
    'server_pg.js',
    'db_pg.js',
    'scraper.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/test*.js',
    '!**/dist/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
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
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],

  // Output directory for coverage reports
  coverageDirectory: 'coverage',

  // Timeout for tests (increased for integration tests)
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset modules between tests
  resetModules: false,

  // Maximum number of parallel workers (set to 1 for easier debugging)
  maxWorkers: '50%',

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/fixtures/'
  ],

  // Module paths
  moduleDirectories: [
    'node_modules',
    'crawler'
  ],

  // Ignore transforms for these modules
  transformIgnorePatterns: [
    '/node_modules/'
  ]
};
