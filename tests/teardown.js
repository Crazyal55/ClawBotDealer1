/**
 * Global test teardown.
 * Jest calls this exported async function once after all suites.
 */
module.exports = async () => {
  console.log('\nCleaning up test environment...\n');

  if (global.testPool) {
    try {
      await global.testPool.end();
      console.log('Test database connection closed');
    } catch (error) {
      console.error('Error closing test database:', error.message);
    }
  }
};
