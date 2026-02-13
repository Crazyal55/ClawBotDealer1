const axios = require('axios');
const URLDiscoverer = require('./crawler/url-discoverer');
const RequestQueue = require('./crawler/request-queue');
const SessionManager = require('./crawler/session-manager');
const scraper = require('./scraper');

/**
 * CarInventoryCrawler - Orchestrates crawling of dealership websites
 */
class CarInventoryCrawler {
  constructor(options = {}) {
    // Configuration
    this.maxPages = options.maxPages || 50;
    this.maxVehicles = options.maxVehicles || 500;
    this.concurrency = options.concurrency || 3;
    this.rateLimit = options.rateLimit || 1500;
    this.maxRetries = options.maxRetries || 3;
    this.usePuppeteer = options.usePuppeteer || 'auto'; // 'auto', 'always', 'never'

    // Limits tracking
    this.pagesCrawled = 0;
    this.vdpPages = 0;
    this.srpPages = 0;
    this.vehiclesFound = new Set();  // Track VINs to avoid duplicates

    // Components
    this.urlDiscoverer = new URLDiscoverer();
    this.session = new SessionManager({
      timeout: options.timeout || 30000
    });

    // Progress callback
    this.onProgress = options.onProgress || null;
  }

  /**
   * Main entry point - start crawling from a URL
   * @param {string} startUrl - URL to start crawling from
   * @param {string} sourceName - Source name for database
   * @returns {Promise<object>} - Crawl results
   */
  async crawl(startUrl, sourceName = 'crawler') {
    console.log(`[Crawler] Starting crawl from ${startUrl}`);
    console.log(`[Crawler] Max pages: ${this.maxPages}, Max vehicles: ${this.maxVehicles}`);

    const startTime = Date.now();

    // Create request queue
    const queue = new RequestQueue({
      concurrency: this.concurrency,
      rateLimit: this.rateLimit,
      maxRetries: this.maxRetries,
      onProgress: (status) => this._handleProgress(status)
    });

    // Add start URL to queue
    queue.add(startUrl, 'unknown', { source: sourceName });

    // Track visited URLs to avoid cycles
    const visited = new Set();
    const discoveredUrls = new Set();

    // Process function for each URL
    const processFn = async (item) => {
      const url = item.url;

      // Skip if already visited
      if (visited.has(url)) {
        return { url, status: 'skipped', reason: 'already_visited' };
      }

      // Skip if we've hit limits
      if (this._shouldStopCrawling()) {
        return { url, status: 'skipped', reason: 'limit_reached' };
      }

      visited.add(url);
      this.pagesCrawled++;

      try {
        // Fetch the page
        const response = await this.session.request(url);
        const html = response.data;

        // Detect page type
        const pageType = this.urlDiscoverer.detectPageType(html, url);

        console.log(`[Crawler] ${url} - ${pageType.toUpperCase()} (${response.status})`);

        if (pageType === 'vdp') {
          this.vdpPages++;
          return await this._handleVDP(url, html, sourceName);

        } else if (pageType === 'srp') {
          this.srpPages++;
          return await this._handleSRP(url, html, queue, sourceName, discoveredUrls);

        } else {
          console.log(`[Crawler] Unknown page type for ${url}`);
          return { url, status: 'unknown_type' };
        }

      } catch (error) {
        console.error(`[Crawler] Error processing ${url}:`, error.message);
        throw error;
      }
    };

    // Start processing queue
    const result = await queue.start(processFn);

    // Compile results
    const duration = Date.now() - startTime;
    const allVehicles = result.results.filter(r => r.vehicle).map(r => r.vehicle);

    console.log(`[Crawler] Crawl complete:`);
    console.log(`[Crawler]   Pages: ${this.pagesCrawled} (VDP: ${this.vdpPages}, SRP: ${this.srpPages})`);
    console.log(`[Crawler]   Vehicles: ${allVehicles.length}`);
    console.log(`[Crawler]   Errors: ${result.errors.length}`);
    console.log(`[Crawler]   Duration: ${Math.round(duration/1000)}s`);

    return {
      success: true,
      vehicles: allVehicles,
      stats: {
        pagesCrawled: this.pagesCrawled,
        vdpPages: this.vdpPages,
        srpPages: this.srpPages,
        totalVehicles: allVehicles.length,
        errors: result.errors.length,
        duration: duration
      }
    };
  }

  /**
   * Handle a VDP (Vehicle Detail Page)
   * @param {string} url - Page URL
   * @param {string} html - Page HTML
   * @param {string} source - Source name
   * @returns {object} - Result object
   */
  async _handleVDP(url, html, source) {
    try {
      // Use existing scraper to extract vehicle data
      const cheerio = require('cheerio');
      const $ = cheerio.load(html);

      const vehicle = scraper.extractSingleCar($, url);

      if (vehicle && vehicle.vin) {
        // Check for duplicate VIN
        if (this.vehiclesFound.has(vehicle.vin)) {
          console.log(`[Crawler] Duplicate VIN ${vehicle.vin} - skipping`);
          return { url, status: 'duplicate', vin: vehicle.vin };
        }

        if (this.vehiclesFound.size >= this.maxVehicles) {
          console.log(`[Crawler] Max vehicles (${this.maxVehicles}) reached`);
          return { url, status: 'skipped', reason: 'max_vehicles' };
        }

        this.vehiclesFound.add(vehicle.vin);

        return {
          url,
          status: 'success',
          type: 'vdp',
          vehicle: { ...vehicle, source }
        };
      }

      return { url, status: 'no_vehicle_data' };

    } catch (error) {
      console.error(`[Crawler] Error extracting VDP ${url}:`, error.message);
      return { url, status: 'error', error: error.message };
    }
  }

  /**
   * Handle an SRP (Search Results Page)
   * @param {string} url - Page URL
   * @param {string} html - Page HTML
   * @param {RequestQueue} queue - Queue to add discovered URLs to
   * @param {string} source - Source name
   * @param {Set} discoveredUrls - Set of already discovered URLs
   * @returns {object} - Result object
   */
  async _handleSRP(url, html, queue, source, discoveredUrls) {
    try {
      // Discover VDP links
      const vdpLinks = this.urlDiscoverer.discoverVDPLinks(html, url);
      console.log(`[Crawler] Found ${vdpLinks.length} VDP links on ${url}`);

      // Discover pagination
      const pagination = this.urlDiscoverer.discoverPaginationLinks(html, url);
      if (pagination.nextUrl) {
        console.log(`[Crawler] Found next page: ${pagination.nextUrl}`);
      }
      if (pagination.allPages.length > 0) {
        console.log(`[Crawler] Found ${pagination.allPages.length} total pages`);
      }

      // Add VDP links to queue
      let added = 0;
      for (const vdpUrl of vdpLinks) {
        if (!discoveredUrls.has(vdpUrl)) {
          discoveredUrls.add(vdpUrl);

          // Check limits before adding
          if (this.pagesCrawled + queue.queue.length >= this.maxPages) {
            console.log(`[Crawler] Max pages (${this.maxPages}) reached`);
            break;
          }

          if (queue.add(vdpUrl, 'vdp', { source })) {
            added++;
          }
        }
      }

      // Add pagination links to queue
      if (pagination.nextUrl && !discoveredUrls.has(pagination.nextUrl)) {
        discoveredUrls.add(pagination.nextUrl);
        queue.add(pagination.nextUrl, 'srp', { source });
      }

      // Also add other discovered pages (up to limit)
      for (const pageUrl of pagination.allPages) {
        if (!discoveredUrls.has(pageUrl)) {
          discoveredUrls.add(pageUrl);

          if (this.pagesCrawled + queue.queue.length >= this.maxPages) {
            break;
          }

          queue.add(pageUrl, 'srp', { source });
        }
      }

      return {
        url,
        status: 'success',
        type: 'srp',
        vdpLinksFound: vdpLinks.length,
        vdpLinksAdded: added
      };

    } catch (error) {
      console.error(`[Crawler] Error processing SRP ${url}:`, error.message);
      return { url, status: 'error', error: error.message };
    }
  }

  /**
   * Check if we should stop crawling
   * @returns {boolean}
   */
  _shouldStopCrawling() {
    if (this.pagesCrawled >= this.maxPages) {
      console.log(`[Crawler] Stop: Max pages (${this.maxPages}) reached`);
      return true;
    }

    if (this.vehiclesFound.size >= this.maxVehicles) {
      console.log(`[Crawler] Stop: Max vehicles (${this.maxVehicles}) reached`);
      return true;
    }

    return false;
  }

  /**
   * Handle progress updates from queue
   * @param {object} status - Queue status
   */
  _handleProgress(status) {
    if (this.onProgress) {
      this.onProgress({
        ...status,
        pagesCrawled: this.pagesCrawled,
        vdpPages: this.vdpPages,
        srpPages: this.srpPages,
        vehiclesFound: this.vehiclesFound.size
      });
    }
  }

  /**
   * Get current crawler status
   * @returns {object} - Current status
   */
  getStatus() {
    return {
      pagesCrawled: this.pagesCrawled,
      vdpPages: this.vdpPages,
      srpPages: this.srpPages,
      vehiclesFound: this.vehiclesFound.size,
      maxPages: this.maxPages,
      maxVehicles: this.maxVehicles
    };
  }
}

module.exports = CarInventoryCrawler;
