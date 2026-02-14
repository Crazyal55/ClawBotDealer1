/**
 * Global test teardown
 * Runs once after all test suites
 */

afterAll(async () => {
  console.log('\n🧹 Cleaning up test environment...\n');

  // Close test database connection
  if (global.testPool) {
    try {
      await global.testPool.end();
      console.log('✓ Test database closed');
    } catch (error) {
      console.error('✗ Error closing test database:', error.message);
    }
  }

  console.log('\n✅ Test suite complete\n');
});

/**
 * Clean test data between tests
 * Run this in afterEach() hooks in test files
 */
async function cleanupTestData() {
  if (!global.testPool) {
    return;
  }

  try {
    await global.testPool.query('TRUNCATE vehicles, dealer_locations, dealers CASCADE');
  } catch (error) {
    console.error('Error cleaning test data:', error.message);
  }
}

module.exports = { cleanupTestData };
