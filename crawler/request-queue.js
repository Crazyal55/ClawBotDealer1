/**
 * RequestQueue - Manages URL queue with concurrency control and rate limiting
 */
class RequestQueue {
  constructor(options = {}) {
    this.queue = [];
    this.running = 0;
    this.completed = 0;
    this.failed = 0;

    // Configuration
    this.concurrency = options.concurrency || 3;        // Max concurrent requests
    this.rateLimit = options.rateLimit || 1500;          // Delay between requests (ms)
    this.maxRetries = options.maxRetries || 3;             // Max retry attempts
    this.retryDelay = options.retryDelay || 1000;             // Initial retry delay (ms)

    // Rate limiting
    this.lastRequestTime = 0;
    this.requestTimes = [];  // Track recent requests for adaptive rate limiting

    // Results
    this.results = [];
    this.errors = [];

    // Callbacks
    this.onProgress = options.onProgress || null;
  }

  /**
   * Add URL to queue
   * @param {string} url - URL to process
   * @param {string} type - URL type ('vdp', 'srp', 'unknown')
   * @param {object} metadata - Additional metadata
   */
  add(url, type = 'unknown', metadata = {}) {
    // Check for duplicates
    if (this.queue.some(item => item.url === url)) {
      return false;
    }

    this.queue.push({
      url,
      type,
      metadata,
      attempts: 0,
      addedAt: Date.now()
    });

    this._emitProgress();
    return true;
  }

  /**
   * Add multiple URLs to queue
   * @param {Array} urls - Array of {url, type, metadata} objects
   */
  addAll(urls) {
    let added = 0;
    for (const item of urls) {
      if (this.add(item.url, item.type, item.metadata)) {
        added++;
      }
    }
    return added;
  }

  /**
   * Start processing the queue
   * @param {Function} processFn - Async function to process each URL
   */
  async start(processFn) {
    this.processFn = processFn;
    this.startTime = Date.now();

    // Start processing loop
    while (this._shouldContinue()) {
      // Wait for rate limit
      await this._waitForRateLimit();

      // Start next batch
      const started = this._startNextBatch();

      // If nothing started, break
      if (started === 0) {
        break;
      }

      // Wait for at least one to complete before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait for all running to complete
    while (this.running > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      completed: this.completed,
      failed: this.failed,
      results: this.results,
      errors: this.errors,
      duration: Date.now() - this.startTime
    };
  }

  /**
   * Check if processing should continue
   */
  _shouldContinue() {
    // Continue if there are queued items
    return this.queue.length > 0 || this.running > 0;
  }

  /**
   * Start next batch of requests based on concurrency limit
   */
  _startNextBatch() {
    let started = 0;
    const availableSlots = this.concurrency - this.running;

    while (started < availableSlots && this.queue.length > 0) {
      const item = this.queue.shift();
      this._processItem(item);
      started++;
      this.running++;
    }

    return started;
  }

  /**
   * Process a single queue item
   */
  async _processItem(item) {
    const startTime = Date.now();

    try {
      // Call the process function
      const result = await this.processFn(item);

      // Success
      this.completed++;
      this.results.push(result);
      this.running--;

      // Update rate limit tracking
      this._trackRequest(Date.now() - startTime);

    } catch (error) {
      // Error - check if we should retry
      item.attempts++;

      if (item.attempts <= this.maxRetries && this._shouldRetry(error)) {
        // Retry with exponential backoff
        const delay = this.retryDelay * Math.pow(2, item.attempts - 1);
        this.running--;  // Decrement running count

        setTimeout(() => {
          this.queue.unshift(item);  // Add to front of queue
          this._emitProgress();
        }, delay);

      } else {
        // Failed permanently
        this.failed++;
        this.running--;
        this.errors.push({
          url: item.url,
          error: error.message,
          attempts: item.attempts
        });

        this._trackRequest(Date.now() - startTime);
      }
    }

    this._emitProgress();
  }

  /**
   * Wait for rate limit before next request
   */
  async _waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimit) {
      const waitTime = this.rateLimit - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Track request timing for adaptive rate limiting
   */
  _trackRequest(duration) {
    const now = Date.now();
    this.requestTimes.push(now);
    this.lastRequestTime = now;

    // Keep only recent requests (last 60 seconds)
    const cutoff = now - 60000;
    this.requestTimes = this.requestTimes.filter(time => time > cutoff);
  }

  /**
   * Check if error is retryable
   */
  _shouldRetry(error) {
    // Retry on network errors
    if (error.code === 'ECONNRESET' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND') {
      return true;
    }

    // Retry on HTTP errors
    if (error.response) {
      const status = error.response.status;
      // Retry on 5xx errors, 429 (too many requests), 408 (timeout)
      if (status >= 500 || status === 429 || status === 408) {
        return true;
      }
    }

    // Don't retry on 4xx client errors (except 429)
    return false;
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queued: this.queue.length,
      running: this.running,
      completed: this.completed,
      failed: this.failed,
      total: this.completed + this.failed + this.running + this.queue.length,
      requestsPerMinute: this.requestTimes.length,
      averageRequestTime: this._getAverageRequestTime()
    };
  }

  /**
   * Calculate average request time
   */
  _getAverageRequestTime() {
    if (!this.requestTimes || this.requestTimes.length < 2) {
      return 0;
    }

    let total = 0;
    for (let i = 1; i < this.requestTimes.length; i++) {
      total += this.requestTimes[i] - this.requestTimes[i - 1];
    }

    return total / (this.requestTimes.length - 1);
  }

  /**
   * Emit progress callback if registered
   */
  _emitProgress() {
    if (this.onProgress) {
      this.onProgress(this.getStatus());
    }
  }
}

module.exports = RequestQueue;
