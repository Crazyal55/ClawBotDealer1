/**
 * BrowserRenderer - Puppeteer-based browser rendering for JavaScript-heavy sites
 *
 * Purpose: Handle sites that require browser rendering (SPAs, dynamic content)
 */

class BrowserRenderer {
  constructor(options = {}) {
    this.browser = null;
    this.puppeteer = null;

    // Configuration
    this.timeout = options.timeout || 30000;
    this.headless = options.headless !== false; // Default to headless
    this.viewport = options.viewport || {
      width: 1920,
      height: 1080
    };

    // Performance optimization
    this.resourceLimits = options.resourceLimits || {
      maxRequests: 500,  // Increased for JavaScript-heavy sites
      idleTimeout: 3000   // Wait longer for dynamic content
    };
  }

  /**
   * Initialize Puppeteer browser
   * @returns {Promise<Browser>}
   */
  async init() {
    if (this.browser) {
      return this.browser;
    }

    try {
      // Dynamic import to only load when needed
      this.puppeteer = require('puppeteer');

      console.log('[BrowserRenderer] Launching browser...');
      this.browser = await this.puppeteer.launch({
        headless: this.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });

      console.log('[BrowserRenderer] Browser launched successfully');
      return this.browser;

    } catch (error) {
      console.error('[BrowserRenderer] Failed to initialize:', error.message);
      throw new Error(`Browser initialization failed: ${error.message}`);
    }
  }

  /**
   * Fetch page with browser rendering
   * @param {string} url - URL to fetch
   * @param {object} options - Rendering options
   * @returns {Promise<{html: string, status: number}>}
   */
  async fetch(url, options = {}) {
    const browser = await this.init();
    const page = await browser.newPage();

    try {
      // Set viewport
      await page.setViewport(this.viewport);

      // Block unnecessary resources (ads, analytics, tracking) to reduce requests
      await page.setRequestInterception(true);

      page.on('request', (request) => {
        const resourceType = request.resourceType();
        const url = request.url();

        // Block images, fonts, stylesheets, media, WebSocket, and other non-essential resources
        if (['image', 'font', 'stylesheet', 'media', 'websocket'].includes(resourceType)) {
          request.abort();
        } else if (url.includes('analytics') ||
                   url.includes('tracking') ||
                   url.includes('telemetry') ||
                   url.includes('ad.doubleclick') ||
                   url.includes('facebook') ||
                   url.includes('twitter')) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Set user agent
      const userAgent = options.userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      await page.setUserAgent(userAgent);

      // Set headers if provided
      if (options.headers) {
        await page.setExtraHTTPHeaders(options.headers);
      }

      // Track resource loading for idle detection
      let requestCount = 0;
      let lastRequestTime = Date.now();

      // Simple resource monitoring (no interception/abort)
      // Disabled to reduce noise
      // if (this.resourceLimits.maxRequests) {
      //   page.on('request', () => { requestCount++; });
      // }

      // Navigate to URL with timeout
      console.log(`[BrowserRenderer] Loading ${url}...`);
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',  // Wait for DOM to be ready
        timeout: 20000  // 20 second timeout for initial load
      });

      // Wait for JavaScript to execute and populate content
      // Use a simple timeout approach for complex SPAs
      console.log(`[BrowserRenderer] Waiting for dynamic content to load...`);
      await new Promise(resolve => setTimeout(resolve, 15000));  // Wait 8 seconds

      // Optional: Try to wait for skeleton loaders to disappear
      try {
        await page.waitForFunction(() => {
          const skeletons = document.querySelectorAll('.skeleton, [class*="skeleton"]');
          return skeletons.length === 0 || document.body.textContent.length > 5000;
        }, { timeout: 5000 });
        console.log(`[BrowserRenderer] Skeleton loaders removed`);
      } catch (err) {
        console.log(`[BrowserRenderer] Skeleton loaders still present, continuing anyway`);
      }

      // Get final HTML
      const html = await page.content();
      const status = response ? response.status() : 0;

      console.log(`[BrowserRenderer] Page loaded: ${url} (${status}, ${html.length} bytes)`);

      return { html, status };

    } catch (error) {
      console.error(`[BrowserRenderer] Error fetching ${url}:`, error.message);

      // Try to get status from page
      let status = 0;
      try {
        const response = await page.evaluate(() => {
          return window.performance?.getEntriesByType('navigation')?.[0]?.responseStatus || 0;
        });
        status = response;
      } catch (err) {
        // Ignore
      }

      throw new Error(`Browser render failed for ${url}: ${error.message}`);

    } finally {
      await page.close();
    }
  }

  /**
   * Wait for network idle (no active requests)
   * @param {Page} page - Puppeteer page
   * @param {number} timeout - Idle timeout in ms
   * @returns {Promise<void>}
   */
  async _waitForIdle(page, timeout) {
    const startTime = Date.now();
    let lastActivity = Date.now();

    const checkIdle = () => {
      return new Promise((resolve) => {
        const idleTimer = setInterval(() => {
          const timeSinceActivity = Date.now() - lastActivity;

          if (timeSinceActivity >= timeout) {
            clearInterval(idleTimer);
            resolve();
          }
        }, 100);

        // Track activity
        page.on('request', () => { lastActivity = Date.now(); });
        page.on('response', () => { lastActivity = Date.now(); });
      });
    };

    try {
      await Promise.race([
        checkIdle(),
        new Promise(resolve => setTimeout(resolve, 10000)) // Max 10s wait
      ]);
    } catch (err) {
      // Ignore idle check errors
    }
  }

  /**
   * Take screenshot (useful for debugging)
   * @param {string} url - URL to screenshot
   * @param {string} path - Screenshot save path
   * @returns {Promise<Buffer>}
   */
  async screenshot(url, path = null) {
    const browser = await this.init();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: this.timeout });

      if (path) {
        await page.screenshot({ path, fullPage: true });
      }

      return await page.screenshot({ fullPage: true });

    } finally {
      await page.close();
    }
  }

  /**
   * Execute JavaScript in page context
   * @param {string} url - URL to load
   * @param {function|string} script - Script to execute
   * @returns {Promise<any>}
   */
  async executeScript(url, script) {
    const browser = await this.init();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: this.timeout });

      const result = await page.evaluate(script);
      return result;

    } finally {
      await page.close();
    }
  }

  /**
   * Close browser and free resources
   * @returns {Promise<void>}
   */
  async close() {
    if (this.browser) {
      console.log('[BrowserRenderer] Closing browser...');
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Check if browser is initialized
   * @returns {boolean}
   */
  isReady() {
    return this.browser !== null;
  }

  /**
   * Detect if a URL likely needs browser rendering
   * @param {string} url - URL to check
   * @param {string} html - Initial HTML (optional)
   * @returns {boolean} - True if likely needs browser
   */
  static needsBrowser(url, html = null) {
    // Check URL patterns that typically need browser
    const needsBrowserPatterns = [
      /react|angular|vue|next\.js|nuxt\.js/i,
      /app\.|spa\.|client\-side/i,
      /#\/|#!/i  // Hash-based routing
    ];

    for (const pattern of needsBrowserPatterns) {
      if (pattern.test(url)) {
        return true;
      }
    }

    // Check HTML content for JavaScript frameworks
    if (html) {
      const jsFrameworkIndicators = [
        /<div id="root"><\/div>/i,
        /<div id="app"><\/div>/i,
        /<div\s+ng-app/i,
        /data-reactroot/i,
        /__NEXT_DATA__/i,
        /window\.__NUXT__/i
      ];

      for (const pattern of jsFrameworkIndicators) {
        if (pattern.test(html)) {
          return true;
        }
      }

      // Check for skeleton loaders ( DealerOn/DSP platforms )
      const skeletonLoaderIndicators = [
        /skeleton/i,
        /vehicle-card-skeleton/i,
        /skeleton-loader/i,
        /WasabiBundle/i,  // DealerOn framework
        /dealeron\.js/i,
        /dlron\.us/i,
        /wasabi/i,
        /searchResultsPageWasabiBundle/i
      ];

      for (const pattern of skeletonLoaderIndicators) {
        if (pattern.test(html)) {
          console.log('[BrowserRenderer] Skeleton loader detected:', pattern);
          return true;
        }
      }

      // Check if page is mostly empty (requires JS to populate)
      const stripped = html.replace(/<script[^>]*>.*?<\/script>/gs, '')
                          .replace(/<style[^>]*>.*?<\/style>/gs, '')
                          .replace(/\s+/g, '');

      if (stripped.length < 500) {
        console.log('[BrowserRenderer] Page appears to be JavaScript-heavy');
        return true;
      }
    }

    return false;
  }
}

module.exports = BrowserRenderer;
