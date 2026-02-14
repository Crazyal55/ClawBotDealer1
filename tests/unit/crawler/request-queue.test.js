/**
 * Unit Tests: RequestQueue
 * Tests for queue operations, concurrency control, retries, and progress tracking
 */

const RequestQueue = require('../../../../crawler/request-queue');

describe('RequestQueue', () => {
  let queue;

  beforeEach(() => {
    queue = new RequestQueue({
      concurrency: 2,  // Low for testing
      rateLimit: 100,   // Fast for testing
      maxRetries: 2
    });
  });

  afterEach(() => {
    // Clean up queue between tests
    if (queue.queue) {
      queue.queue = [];
    }
    if (queue.visited) {
      queue.visited.clear();
    }
  });

  describe('add()', () => {
    test('should add URL to queue', () => {
      const added = queue.add('https://example.com/1', 'vdp', { source: 'test' });

      expect(added).toBe(true);
      expect(queue.queue).toHaveLength(1);
      expect(queue.queue[0].url).toBe('https://example.com/1');
      expect(queue.queue[0].type).toBe('vdp');
      expect(queue.queue[0].metadata).toEqual({ source: 'test' });
    });

    test('should reject duplicate URLs', () => {
      queue.add('https://example.com/1', 'vdp');
      queue.add('https://example.com/1', 'vdp');

      expect(queue.queue).toHaveLength(1);
    });

    test('should normalize URLs before deduplication', () => {
      queue.add('https://example.com/vehicle/1', 'vdp');
      queue.add('https://example.com/vehicle/1#photos', 'vdp');
      queue.add('https://example.com/vehicle/1/', 'vdp');

      // Should only keep one
      expect(queue.queue).toHaveLength(1);
    });

    test('should handle metadata parameter', () => {
      queue.add('https://example.com/1', 'vdp', {
        source: 'test',
        priority: 1
      });

      expect(queue.queue[0].metadata).toEqual({
        source: 'test',
        priority: 1
      });
    });

    test('should return false for duplicate URLs', () => {
      queue.add('https://example.com/1', 'vdp');
      const added = queue.add('https://example.com/1', 'vdp');

      expect(added).toBe(false);
    });
  });

  describe('start()', () => {
    test('should process all items in queue', async () => {
      queue.add('https://example.com/1', 'vdp');
      queue.add('https://example.com/2', 'vdp');
      queue.add('https://example.com/3', 'vdp');

      const processFn = async (item) => {
        return { url: item.url, status: 'success' };
      };

      const result = await queue.start(processFn);

      expect(result.results).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    test('should respect concurrency limits', async () => {
      let runningCount = 0;
      let maxRunning = 0;

      const processFn = async (item) => {
        runningCount++;
        maxRunning = Math.max(maxRunning, runningCount);

        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 50));

        runningCount--;
        return { url: item.url, status: 'success' };
      };

      // Add more items than concurrency
      for (let i = 1; i <= 5; i++) {
        queue.add(`https://example.com/${i}`, 'vdp');
      }

      await queue.start(processFn);

      // Should never exceed concurrency of 2
      expect(maxRunning).toBeLessThanOrEqual(2);
    });

    test('should respect rate limit between requests', async () => {
      const timestamps = [];

      const processFn = async (item) => {
        timestamps.push(Date.now());
        return { url: item.url, status: 'success' };
      };

      queue.add('https://example.com/1', 'vdp');
      queue.add('https://example.com/2', 'vdp');
      queue.add('https://example.com/3', 'vdp');

      await queue.start(processFn);

      // Check delay between first two requests
      const delay = timestamps[1] - timestamps[0];
      // Should have at least 100ms delay (rateLimit)
      expect(delay).toBeGreaterThanOrEqual(90);
    });

    test('should handle errors gracefully', async () => {
      const processFn = async (item) => {
        if (item.url.includes('2')) {
          throw new Error('Test error');
        }
        return { url: item.url, status: 'success' };
      };

      queue.add('https://example.com/1', 'vdp');
      queue.add('https://example.com/2', 'vdp');
      queue.add('https://example.com/3', 'vdp');

      const result = await queue.start(processFn);

      expect(result.results).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Test error');
    });

    test('should return completed results', async () => {
      const processFn = async (item) => {
        return { url: item.url, processed: true };
      };

      queue.add('https://example.com/1', 'vdp');
      queue.add('https://example.com/2', 'vdp');

      const result = await queue.start(processFn);

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({
        url: 'https://example.com/1',
        processed: true
      });
    });
  });

  describe('Retry logic', () => {
    test('should retry failed requests', async () => {
      let attempts = 0;

      const processFn = async (item) => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return { url: item.url, status: 'success', attempts };
      };

      queue.add('https://example.com/1', 'vdp');

      const result = await queue.start(processFn);

      expect(attempts).toBe(3); // Initial + 2 retries
      expect(result.errors).toHaveLength(0);
      expect(result.results[0].attempts).toBe(3);
    });

    test('should stop retrying after maxRetries', async () => {
      let attempts = 0;

      const processFn = async (item) => {
        attempts++;
        throw new Error('Permanent failure');
      };

      queue.add('https://example.com/1', 'vdp');

      const result = await queue.start(processFn);

      // Should try maxRetries + 1 times (initial + retries)
      expect(attempts).toBe(3); // 1 initial + 2 retries
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Permanent failure');
    });

    test('should use exponential backoff for retries', async () => {
      const delays = [];
      let attempt = 0;

      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0); // Execute immediately
      });

      try {
        const processFn = async (item) => {
          attempt++;
          if (attempt <= 2) {
            throw new Error('Retryable error');
          }
          return { url: item.url, status: 'success' };
        };

        queue.add('https://example.com/1', 'vdp');

        await queue.start(processFn);

        // Should have exponential backoff: 1000ms, 2000ms
        expect(delays).toContain(1000);
        expect(delays).toContain(2000);
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });

    test('should retry on 5xx status codes', async () => {
      let attempts = 0;

      const processFn = async (item) => {
        attempts++;
        const error = new Error('HTTP 500');
        error.status = 500;
        if (attempts < 2) {
          throw error;
        }
        return { url: item.url, status: 'success' };
      };

      queue.add('https://example.com/1', 'vdp');

      const result = await queue.start(processFn);

      expect(attempts).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    test('should not retry on 4xx status codes (except 429)', async () => {
      let attempts = 0;

      const processFn = async (item) => {
        attempts++;
        const error = new Error('HTTP 404');
        error.status = 404;
        throw error;
      };

      queue.add('https://example.com/1', 'vdp');

      const result = await queue.start(processFn);

      expect(attempts).toBe(1); // No retry
      expect(result.errors).toHaveLength(1);
    });

    test('should retry on 429 (rate limit)', async () => {
      let attempts = 0;

      const processFn = async (item) => {
        attempts++;
        const error = new Error('HTTP 429');
        error.status = 429;
        if (attempts < 2) {
          throw error;
        }
        return { url: item.url, status: 'success' };
      };

      queue.add('https://example.com/1', 'vdp');

      const result = await queue.start(processFn);

      expect(attempts).toBe(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Progress tracking', () => {
    test('should call onProgress callback', async () => {
      const progressUpdates = [];

      const queueWithProgress = new RequestQueue({
        concurrency: 1,
        rateLimit: 10,
        onProgress: (status) => progressUpdates.push(status)
      });

      const processFn = async (item) => {
        return { url: item.url, status: 'success' };
      };

      queueWithProgress.add('https://example.com/1', 'vdp');
      queueWithProgress.add('https://example.com/2', 'vdp');

      await queueWithProgress.start(processFn);

      expect(progressUpdates.length).toBeGreaterThan(0);
    });

    test('should include correct progress fields', async () => {
      let progressUpdate = null;

      const queueWithProgress = new RequestQueue({
        concurrency: 1,
        onProgress: (status) => {
          progressUpdate = status;
        }
      });

      const processFn = async (item) => {
        return { url: item.url, status: 'success' };
      };

      queueWithProgress.add('https://example.com/1', 'vdp');

      await queueWithProgress.start(processFn);

      expect(progressUpdate).toHaveProperty('queued');
      expect(progressUpdate).toHaveProperty('running');
      expect(progressUpdate).toHaveProperty('completed');
      expect(progressUpdate).toHaveProperty('failed');
      expect(progressUpdate).toHaveProperty('total');
    });

    test('should track progress for multiple items', async () => {
      const updates = [];

      const queueWithProgress = new RequestQueue({
        concurrency: 1,
        rateLimit: 10,
        onProgress: (status) => updates.push(status)
      });

      const processFn = async (item) => {
        return { url: item.url, status: 'success' };
      };

      for (let i = 1; i <= 3; i++) {
        queueWithProgress.add(`https://example.com/${i}`, 'vdp');
      }

      await queueWithProgress.start(processFn);

      expect(updates.length).toBeGreaterThan(2);

      // Final update should show all completed
      const finalUpdate = updates[updates.length - 1];
      expect(finalUpdate.completed).toBe(3);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty queue', async () => {
      const processFn = async (item) => {
        return { url: item.url, status: 'success' };
      };

      const result = await queue.start(processFn);

      expect(result.results).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle process function that returns null', async () => {
      const processFn = async (item) => {
        return null;
      };

      queue.add('https://example.com/1', 'vdp');

      const result = await queue.start(processFn);

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toBeNull();
    });

    test('should handle process function that throws synchronously', async () => {
      const processFn = async (item) => {
        throw new Error('Sync error');
      };

      queue.add('https://example.com/1', 'vdp');

      const result = await queue.start(processFn);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Sync error');
    });

    test('should handle queue operations during processing', async () => {
      const processFn = async (item) => {
        // Try to add items while processing
        if (item.url.includes('1')) {
          queue.add('https://example.com/4', 'vdp');
        }
        return { url: item.url, status: 'success' };
      };

      queue.add('https://example.com/1', 'vdp');
      queue.add('https://example.com/2', 'vdp');
      queue.add('https://example.com/3', 'vdp');

      const result = await queue.start(processFn);

      // Original 3 items should be processed
      expect(result.results).toHaveLength(3);
      // Item 4 added during processing may or may not be processed
      // depending on timing, which is acceptable
    });
  });

  describe('Configuration', () => {
    test('should use custom concurrency setting', async () => {
      let maxConcurrent = 0;
      let current = 0;

      const customQueue = new RequestQueue({
        concurrency: 3,
        rateLimit: 10
      });

      const processFn = async (item) => {
        current++;
        maxConcurrent = Math.max(maxConcurrent, current);
        await new Promise(resolve => setTimeout(resolve, 50));
        current--;
        return { url: item.url, status: 'success' };
      };

      for (let i = 1; i <= 10; i++) {
        customQueue.add(`https://example.com/${i}`, 'vdp');
      }

      await customQueue.start(processFn);

      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    test('should use custom rate limit', async () => {
      const timestamps = [];

      const customQueue = new RequestQueue({
        concurrency: 1,
        rateLimit: 200  // 200ms delay
      });

      const processFn = async (item) => {
        timestamps.push(Date.now());
        return { url: item.url, status: 'success' };
      };

      customQueue.add('https://example.com/1', 'vdp');
      customQueue.add('https://example.com/2', 'vdp');

      await customQueue.start(processFn);

      const delay = timestamps[1] - timestamps[0];
      expect(delay).toBeGreaterThanOrEqual(190); // At least 200ms
    });
  });
});
