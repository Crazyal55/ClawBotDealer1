const cheerio = require('cheerio');
const URL = require('url').URL;

/**
 * URLDiscoverer - Finds VDP links and pagination on dealership pages
 */
class URLDiscoverer {
  constructor() {
    // Patterns that indicate vehicle detail pages
    this.vdpPatterns = [
      /\/vehicle\/?/i,
      /\/vin\/?/i,
      /\/inventory\/[^/]+/i,
      /\/details\/?/i,
      /\/car\/?/i,
      /\/vehicle-details\/?/i,
      /\/stock\/?/i,
      /\/item\/?/i
    ];

    // Patterns that indicate vehicle detail pages by VIN
    this.vinPattern = /[A-HJ-NPR-Z0-9]{17}/i;

    // CSS selectors that likely contain VDP links
    this.vdpLinkSelectors = [
      'a[href*="/vehicle/"]',
      'a[href*="/vin/"]',
      'a[href*="/inventory/"]',
      'a[href*="/details/"]',
      'a[href*="/car/"]',
      'a.vehicle-link',
      'a.detail-link',
      'a.inventory-item',
      'a[class*="vehicle"]',
      'a[class*="detail"]',
      'a[class*="listing"]'
    ];

    // Pagination selectors
    this.paginationSelectors = {
      next: [
        'a.next',
        'a.pagination-next',
        'a[rel="next"]',
        'a[class*="next"]',
        '[aria-label="next"]'
      ],
      pages: [
        '.page-link',
        '.pagination a',
        '.pagination-link',
        'a[class*="page"]',
        '[class*="pagination"] a'
      ]
    };
  }

  /**
   * Discover all VDP (Vehicle Detail Page) links from a SRP (Search Results Page)
   */
  discoverVDPLinks(html, baseUrl) {
    const $ = cheerio.load(html);
    const links = new Set();
    const base = new URL(baseUrl);

    // Try each selector
    for (let i = 0; i < this.vdpLinkSelectors.length; i++) {
      const selector = this.vdpLinkSelectors[i];
      const elements = $(selector);
      if (elements.length === 0) continue;

      elements.each((idx, el) => {
        const href = $(el).attr('href');
        if (!href) return;

        // Resolve relative URLs
        let fullUrl;
        try {
          fullUrl = new URL(href, base.origin).href;
        } catch (e) {
          return;
        }

        // Check if it looks like a VDP link
        if (this.isVDPLink(fullUrl)) {
          // Remove fragments for deduplication
          const cleanUrl = this.cleanUrl(fullUrl);
          links.add(cleanUrl);
        }
      });

      // If we found links with this selector, don't try others
      if (links.size > 0) {
        break;
      }
    }

    return Array.from(links);
  }

  /**
   * Discover pagination links from a page
   */
  discoverPaginationLinks(html, baseUrl) {
    const $ = cheerio.load(html);
    const base = new URL(baseUrl);
    const allPages = new Set();
    let nextUrl = null;

    // Look for "Next" button
    for (let i = 0; i < this.paginationSelectors.next.length; i++) {
      const selector = this.paginationSelectors.next[i];
      const $el = $(selector);
      if ($el.length > 0) {
        const href = $el.first().attr('href');
        if (href) {
          try {
            nextUrl = new URL(href, base.origin).href;
          } catch (e) {}
          break;
        }
      }
    }

    // Look for all page numbers
    for (let i = 0; i < this.paginationSelectors.pages.length; i++) {
      const selector = this.paginationSelectors.pages[i];
      const elements = $(selector);
      if (elements.length === 0) continue;

      elements.each((idx, el) => {
        const href = $(el).attr('href');
        if (!href) return;

        try {
          const fullUrl = new URL(href, base.origin).href;
          const cleanUrl = this.cleanUrl(fullUrl);
          allPages.add(cleanUrl);
        } catch (e) {}
      });

      // If we found pages with this selector, don't try others
      if (allPages.size > 0) {
        break;
      }
    }

    // Also detect URL-based pagination patterns in current page
    const urlBasedPages = this.detectUrlBasedPagination($, base);
    urlBasedPages.forEach(url => allPages.add(url));

    return {
      nextUrl: nextUrl,
      allPages: Array.from(allPages)
    };
  }

  /**
   * Detect pagination based on URL patterns on the page
   */
  detectUrlBasedPagination($, base) {
    const pages = new Set();

    // Look for links with page numbers in query params or path
    const patterns = [
      /\?page=(\d+)/i,
      /\/page\/(\d+)/i,
      /\/p\/(\d+)/i,
      /\/page-(\d+)/i
    ];

    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      for (let j = 0; j < patterns.length; j++) {
        const pattern = patterns[j];
        const match = href.match(pattern);
        if (match) {
          try {
            const fullUrl = new URL(href, base.origin).href;
            pages.add(this.cleanUrl(fullUrl));
          } catch (e) {}
          break;
        }
      }
    });

    return pages;
  }

  /**
   * Check if a URL appears to be a VDP (Vehicle Detail Page)
   */
  isVDPLink(url) {
    // Check path patterns
    for (let i = 0; i < this.vdpPatterns.length; i++) {
      if (this.vdpPatterns[i].test(url)) {
        return true;
      }
    }

    // Check for VIN in URL
    if (this.vinPattern.test(url)) {
      return true;
    }

    return false;
  }

  /**
   * Detect page type from HTML content
   */
  detectPageType(html, url) {
    const $ = cheerio.load(html);

    // Count VDP indicators
    const vdpIndicators = [
      'vin',
      'vehicle identification number',
      'stock number',
      'vehicle details'
    ];

    const bodyText = $('body').text().toLowerCase();
    let vdpCount = 0;
    for (let i = 0; i < vdpIndicators.length; i++) {
      if (bodyText.includes(vdpIndicators[i])) {
        vdpCount++;
      }
    }

    // Count potential vehicle cards/links
    const vehicleCards = $('.vehicle, .car-card, .inventory-item, .vehicle-item, [class*="vehicle"], [class*="inventory"], [class*="listing"]').length;
    const vdpLinks = $('a[href*="/vehicle/"], a[href*="/vin/"], a[href*="/details/"], a[href*="/car/"]').length;

    // Check for JSON-LD vehicle data
    let hasVehicleJsonLd = false;
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const data = JSON.parse($(el).html());
        if (Array.isArray(data)) {
          hasVehicleJsonLd = data.some(item => item['@type'] === 'Car' || item['@type'] === 'Vehicle');
        } else {
          hasVehicleJsonLd = (data['@type'] === 'Car' || data['@type'] === 'Vehicle');
        }
      } catch (e) {}
    });

    // Decision logic
    if (vdpCount >= 3 || (hasVehicleJsonLd && vehicleCards < 3)) {
      return 'vdp';
    }

    if (vehicleCards >= 3 || vdpLinks >= 3) {
      return 'srp';
    }

    if (hasVehicleJsonLd) {
      return 'vdp';
    }

    return 'unknown';
  }

  /**
   * Clean URL for deduplication
   */
  cleanUrl(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return url;
    }

    // Remove fragment
    parsed.hash = '';

    // Sort query params for consistency
    parsed.searchParams.sort();

    return parsed.href;
  }
}

module.exports = URLDiscoverer;
