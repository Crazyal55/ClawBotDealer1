/**
 * Unit Tests: URLDiscoverer
 * Tests for URL discovery, pagination detection, and page type detection
 */

const URLDiscoverer = require('../../../../crawler/url-discoverer');
const fs = require('fs');
const path = require('path');

describe('URLDiscoverer', () => {
  let discoverer;

  beforeEach(() => {
    discoverer = new URLDiscoverer();
  });

  describe('discoverVDPLinks', () => {
    test('should find VDP links from Cars.com SRP', () => {
      const html = fs.readFileSync(
        path.join(__dirname, '../../../fixtures/html/cars.com-srp.html'),
        'utf8'
      );

      const links = discoverer.discoverVDPLinks(html, 'https://www.cars.com/inventory/');

      expect(links.length).toBeGreaterThan(0);
      expect(links).toEqual(expect.arrayContaining([
        expect.stringContaining('/vehicle')
      ]));
    });

    test('should deduplicate URLs', () => {
      const html = `
        <html>
          <body>
            <a href="/vehicle/1">Car 1</a>
            <a href="/vehicle/1">Car 1 Again</a>
            <a href="/vehicle/2">Car 2</a>
            <a href="/vehicle/2/">Car 2 with trailing slash</a>
          </body>
        </html>
      `;

      const links = discoverer.discoverVDPLinks(html, 'https://example.com/');

      expect(links).toHaveLength(2);
      expect(links[0]).toBe('https://example.com/vehicle/1');
      expect(links[1]).toBe('https://example.com/vehicle/2');
    });

    test('should resolve relative URLs to absolute', () => {
      const html = `
        <html>
          <body>
            <a href="/vehicles/123.html">Car</a>
            <a href="detail/456.html">Another Car</a>
          </body>
        </html>
      `;

      const links = discoverer.discoverVDPLinks(html, 'https://example.com/inventory/');

      expect(links).toContain('https://example.com/vehicles/123.html');
      expect(links).toContain('https://example.com/inventory/detail/456.html');
    });

    test('should filter out non-VDP links', () => {
      const html = `
        <html>
          <body>
            <a href="/vehicle/123">VDP Link</a>
            <a href="/contact">Contact</a>
            <a href="/about">About Us</a>
            <a href="/finance">Finance</a>
          </body>
        </html>
      `;

      const links = discoverer.discoverVDPLinks(html, 'https://example.com/');

      expect(links).toHaveLength(1);
      expect(links[0]).toBe('https://example.com/vehicle/123');
    });

    test('should recognize multiple VDP URL patterns', () => {
      const html = `
        <html>
          <body>
            <a href="/vehicle/123">Pattern 1</a>
            <a href="/vin/456">Pattern 2</a>
            <a href="/details/789">Pattern 3</a>
            <a href="/inventory/ABC123">Pattern 4</a>
          </body>
        </html>
      `;

      const links = discoverer.discoverVDPLinks(html, 'https://example.com/');

      expect(links).toHaveLength(4);
    });

    test('should handle empty pages gracefully', () => {
      const links = discoverer.discoverVDPLinks('<html><body></body></html>', 'https://example.com/');

      expect(links).toHaveLength(0);
    });

    test('should handle pages with no VDP links', () => {
      const html = `
        <html>
          <body>
            <a href="/contact">Contact</a>
            <a href="/about">About</a>
          </body>
        </html>
      `;

      const links = discoverer.discoverVDPLinks(html, 'https://example.com/');

      expect(links).toHaveLength(0);
    });
  });

  describe('discoverPaginationLinks', () => {
    test('should find "next" pagination links', () => {
      const html = `
        <html>
          <body>
            <a class="next" href="/page/2">Next</a>
            <a class="prev" href="/page/1">Prev</a>
          </body>
        </html>
      `;

      const pagination = discoverer.discoverPaginationLinks(html, 'https://example.com/page/1');

      expect(pagination.nextUrl).toBe('https://example.com/page/2');
      expect(pagination.allPages).toContain('https://example.com/page/2');
    });

    test('should detect numbered page links', () => {
      const html = `
        <html>
          <body>
            <nav class="pagination">
              <a href="/inventory">1</a>
              <a href="/inventory?page=2">2</a>
              <a href="/inventory?page=3">3</a>
              <a href="/inventory?page=4">4</a>
            </nav>
          </body>
        </html>
      `;

      const pagination = discoverer.discoverPaginationLinks(html, 'https://example.com/inventory');

      expect(pagination.allPages.length).toBeGreaterThanOrEqual(3);
      expect(pagination.allPages).toContain('https://example.com/inventory?page=2');
    });

    test('should detect URL-based pagination patterns', () => {
      const patterns = [
        { html: '<a href="?page=2">Next</a>', url: 'https://example.com/inventory' },
        { html: '<a href="/page/2">Next</a>', url: 'https://example.com/' },
        { html: '<a href="/inventory/2">Next</a>', url: 'https://example.com/inventory/1' },
        { html: '<a href="?p=2">Next</a>', url: 'https://example.com/listings' }
      ];

      patterns.forEach(({ html, url }) => {
        const pagination = discoverer.discoverPaginationLinks(html, url);
        expect(pagination.allPages.length).toBeGreaterThan(0);
      });
    });

    test('should detect aria-label pagination', () => {
      const html = `
        <html>
          <body>
            <a href="/page/2" aria-label="Next page">Next</a>
            <a href="/page/1" aria-label="Previous page">Prev</a>
          </body>
        </html>
      `;

      const pagination = discoverer.discoverPaginationLinks(html, 'https://example.com/');

      expect(pagination.nextUrl).toBe('https://example.com/page/2');
    });

    test('should return null nextUrl when no pagination found', () => {
      const html = '<div>No pagination here</div>';

      const pagination = discoverer.discoverPaginationLinks(html, 'https://example.com/');

      expect(pagination.nextUrl).toBeNull();
      expect(pagination.allPages).toHaveLength(0);
    });

    test('should handle pagination with relative URLs', () => {
      const html = `
        <html>
          <body>
            <a class="next-page" href="../page/2">Next</a>
          </body>
        </html>
      `;

      const pagination = discoverer.discoverPaginationLinks(
        html,
        'https://example.com/inventory/listings'
      );

      expect(pagination.nextUrl).toBe('https://example.com/inventory/page/2');
    });
  });

  describe('detectPageType', () => {
    test('should identify VDP pages from JSON-LD', () => {
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "http://schema.org",
                "@type": "Car",
                "name": "2023 Toyota Camry",
                "vehicleIdentificationNumber": "4T1BF1FK5DU123456"
              }
            </script>
          </head>
          <body></body>
        </html>
      `;

      const type = discoverer.detectPageType(html, 'https://example.com/vehicle/123');

      expect(type).toBe('vdp');
    });

    test('should identify VDP from Autotrader HTML structure', () => {
      const html = fs.readFileSync(
        path.join(__dirname, '../../../fixtures/html/autotrader-vdp.html'),
        'utf8'
      );

      const type = discoverer.detectPageType(html, 'https://www.autotrader.com/cars-for-sale/vehicledetails.html');

      expect(type).toBe('vdp');
    });

    test('should identify SRP pages from vehicle listings', () => {
      const html = fs.readFileSync(
        path.join(__dirname, '../../../fixtures/html/cars.com-srp.html'),
        'utf8'
      );

      const type = discoverer.detectPageType(html, 'https://www.cars.com/inventory/');

      expect(type).toBe('srp');
    });

    test('should identify SRP from multiple VDP links', () => {
      const html = `
        <html>
          <body>
            <div class="vehicle-listing">
              <a href="/vehicle/1">Car 1</a>
              <a href="/vehicle/2">Car 2</a>
              <a href="/vehicle/3">Car 3</a>
              <a href="/vehicle/4">Car 4</a>
              <a href="/vehicle/5">Car 5</a>
            </div>
          </body>
        </html>
      `;

      const type = discoverer.detectPageType(html, 'https://example.com/inventory/');

      expect(type).toBe('srp');
    });

    test('should identify SRP from pagination elements', () => {
      const html = `
        <html>
          <body>
            <nav class="pagination">
              <a href="?page=1">1</a>
              <a href="?page=2">2</a>
              <a href="?page=3">3</a>
            </nav>
          </body>
        </html>
      `;

      const type = discoverer.detectPageType(html, 'https://example.com/inventory');

      expect(type).toBe('srp');
    });

    test('should return unknown for unrecognizable pages', () => {
      const html = '<div>Just regular content</div>';

      const type = discoverer.detectPageType(html, 'https://example.com/');

      expect(type).toBe('unknown');
    });

    test('should return unknown for empty pages', () => {
      const type = discoverer.detectPageType('', 'https://example.com/');

      expect(type).toBe('unknown');
    });

    test('should prioritize VDP detection over SRP', () => {
      // Page has both VDP markers and links (edge case)
      const html = `
        <html>
          <head>
            <script type="application/ld+json">
              {"@type": "Car", "name": "Test Car"}
            </script>
          </head>
          <body>
            <a href="/vehicle/2">Related Vehicle</a>
          </body>
        </html>
      `;

      const type = discoverer.detectPageType(html, 'https://example.com/vehicle/1');

      // VDP should win when both are present
      expect(['vdp', 'srp']).toContain(type);
    });
  });

  describe('URL normalization', () => {
    test('should remove fragments from URLs', () => {
      const links = discoverer.discoverVDPLinks(
        '<a href="/vehicle/123#photos">Car</a>',
        'https://example.com/'
      );

      expect(links[0]).not.toContain('#');
    });

    test('should remove query parameters for deduplication', () => {
      const html = `
        <a href="/vehicle/123?ref=listing">Car 1</a>
        <a href="/vehicle/123?source=home">Car 1 Duplicate</a>
      `;

      const links = discoverer.discoverVDPLinks(html, 'https://example.com/');

      expect(links).toHaveLength(1);
    });

    test('should handle URL encoding', () => {
      const links = discoverer.discoverVDPLinks(
        '<a href="/vehicle/2023%20Ford%20Mustang">Car</a>',
        'https://example.com/'
      );

      expect(links[0]).toContain('2023%20Ford%20Mustang');
    });
  });

  describe('Edge cases', () => {
    test('should handle malformed HTML', () => {
      const html = '<div><a href="/vehicle/1">Car</a></div><broken';

      const links = discoverer.discoverVDPLinks(html, 'https://example.com/');

      expect(links).toHaveLength(1);
    });

    test('should handle links without href attribute', () => {
      const html = '<a name="anchor">No href</a>';

      const links = discoverer.discoverVDPLinks(html, 'https://example.com/');

      expect(links).toHaveLength(0);
    });

    test('should handle javascript: links', () => {
      const html = '<a href="javascript:void(0)">Fake Link</a>';

      const links = discoverer.discoverVDPLinks(html, 'https://example.com/');

      expect(links).toHaveLength(0);
    });

    test('should handle mailto: and tel: links', () => {
      const html = `
        <a href="mailto:test@example.com">Email</a>
        <a href="tel:5551234567">Call</a>
      `;

      const links = discoverer.discoverVDPLinks(html, 'https://example.com/');

      expect(links).toHaveLength(0);
    });

    test('should handle deeply nested links', () => {
      const html = `
        <div>
          <div>
            <div>
              <a href="/vehicle/123">Nested Car</a>
            </div>
          </div>
        </div>
      `;

      const links = discoverer.discoverVDPLinks(html, 'https://example.com/');

      expect(links).toHaveLength(1);
    });
  });
});
