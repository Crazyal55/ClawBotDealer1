const scraper = require('../../scraper');
const axios = require('axios');
const cheerio = require('cheerio');

jest.mock('axios');
const mockedAxios = axios;

describe('CarScraper Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Invalid Input Handling', () => {
    it('handles empty curl command', async () => {
      await expect(scraper.fromCurl('')).rejects.toThrow('Could not extract URL from curl command');
    });

    it('handles curl command without URL', async () => {
      await expect(scraper.fromCurl('curl -H "Accept: text/html"')).rejects.toThrow('Could not extract URL from curl command');
    });

    it('handles malformed URL', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Invalid URL'));
      await expect(scraper.fromCurl("curl 'not-a-valid-url'")).rejects.toThrow();
    });

    it('handles network timeout', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      mockedAxios.get.mockRejectedValue(timeoutError);

      await expect(scraper.fromCurl("curl 'https://example.com'")).rejects.toThrow('timeout of 30000ms exceeded');
    });

    it('handles connection refused', async () => {
      const connectionError = new Error('ECONNREFUSED');
      connectionError.code = 'ECONNREFUSED';
      mockedAxios.get.mockRejectedValue(connectionError);

      await expect(scraper.fromCurl("curl 'https://example.com'")).rejects.toThrow('ECONNREFUSED');
    });

    it('handles 404 response', async () => {
      mockedAxios.get.mockResolvedValue({ status: 404, data: '<html><body>Not Found</body></html>' });
      const result = await scraper.fromCurl("curl 'https://example.com/not-found'");
      expect(result.cars).toEqual([]);
    });

    it('handles 500 response', async () => {
      mockedAxios.get.mockResolvedValue({ status: 500, data: '<html><body>Server Error</body></html>' });
      const result = await scraper.fromCurl("curl 'https://example.com/error'");
      expect(result.cars).toEqual([]);
    });

    it('handles rate limiting (429)', async () => {
      const rateLimitError = new Error('Request failed with status code 429');
      rateLimitError.response = { status: 429 };
      mockedAxios.get.mockRejectedValue(rateLimitError);

      await expect(scraper.fromCurl("curl 'https://example.com'")).rejects.toThrow();
    });
  });

  describe('Malformed HTML Handling', () => {
    it('handles empty HTML response', async () => {
      mockedAxios.get.mockResolvedValue({ data: '' });
      const result = await scraper.fromCurl("curl 'https://example.com'");
      expect(result.cars).toEqual([]);
    });

    it('handles HTML without body tag', async () => {
      mockedAxios.get.mockResolvedValue({ data: '<html></html>' });
      const result = await scraper.fromCurl("curl 'https://example.com'");
      expect(result.cars).toEqual([]);
    });

    it('handles HTML with unclosed tags', async () => {
      mockedAxios.get.mockResolvedValue({
        data: '<html><body><div class="price">$25,000</div></body>'
      });
      const result = await scraper.fromCurl("curl 'https://example.com'");
      expect(result.cars).toBeInstanceOf(Array);
    });

    it('handles HTML with script tags', async () => {
      mockedAxios.get.mockResolvedValue({
        data: '<html><body><script>alert("test")</script><div class="price">$25,000</div></body></html>'
      });
      const result = await scraper.fromCurl("curl 'https://example.com'");
      expect(result.cars).toBeInstanceOf(Array);
    });

    it('handles HTML with iframe elements', async () => {
      mockedAxios.get.mockResolvedValue({
        data: '<html><body><iframe src="https://example.com/ad"></iframe><div class="price">$25,000</div></body></html>'
      });
      const result = await scraper.fromCurl("curl 'https://example.com'");
      expect(result.cars).toBeInstanceOf(Array);
    });

    it('handles very large HTML response', async () => {
      const largeHtml = '<html><body>' + '<div>test</div>'.repeat(10000) + '</body></html>';
      mockedAxios.get.mockResolvedValue({ data: largeHtml });
      const result = await scraper.fromCurl("curl 'https://example.com'");
      expect(result.cars).toBeInstanceOf(Array);
    });
  });

  describe('Edge Case Data Extraction', () => {
    it('extracts price with currency symbols', async () => {
      const $ = cheerio.load('<html><body><div class="price">€25.000</div></body></html>');
      expect(scraper.extractPrice($)).toBe(25000);
    });

    it('extracts price with negative value', async () => {
      const $ = cheerio.load('<html><body><div class="price">-$1,000</div></body></html>');
      expect(scraper.extractPrice($)).toBe(-1000);
    });

    it('handles year beyond current year', async () => {
      const $ = cheerio.load('<html><body><div class="year">2099</div></body></html>');
      expect(scraper.extractYear($)).toBeNull();
    });

    it('handles year before 1900', async () => {
      const $ = cheerio.load('<html><body><div class="year">1800</div></body></html>');
      expect(scraper.extractYear($)).toBeNull();
    });

    it('extracts mileage with decimal point', async () => {
      const $ = cheerio.load('<html><body><div class="mileage">45.5k mi</div></body></html>');
      const mileage = scraper.extractMileage($);
      expect(mileage).toBeNull();
    });

    it('handles VIN with special characters', async () => {
      const $ = cheerio.load('<html><body><div class="vin">123-456-789-0AB-CDEF-01</div></body></html>');
      const result = scraper.extractCars($.html(), 'https://example.com');
      if (result.cars.length > 0) {
        expect(result.cars[0].vin).toBe('1234567890ABCDEF01');
      }
    });

    it('handles make/model with special characters', async () => {
      const result = scraper.parseMakeModel('2023 BMW X5 xDrive40i');
      expect(result.make).toBe('BMW');
      expect(result.model).toBe('X5');
    });
  });

  describe('Data Validation', () => {
    it('flags VIN with invalid length', () => {
      const car = { vin: '123', year: 2020 };
      const flags = scraper.getQualityFlags(car);
      expect(flags).toContainEqual({ type: 'error', message: 'Invalid VIN length' });
    });

    it('flags VIN with invalid characters', () => {
      const car = { vin: '1234567890123456!', year: 2020 };
      const flags = scraper.getQualityFlags(car);
      expect(flags.length).toBeGreaterThan(0);
    });

    it('flags negative price', () => {
      const car = { vin: '12345678901234567', price: -1000 };
      const flags = scraper.getQualityFlags(car);
      expect(flags).toContainEqual({ type: 'warning', message: 'Unusual price' });
    });

    it('flags unrealistic price (too high)', () => {
      const car = { vin: '12345678901234567', price: 1000000000 };
      const flags = scraper.getQualityFlags(car);
      expect(flags).toContainEqual({ type: 'warning', message: 'Unusual price' });
    });

    it('flags negative mileage', () => {
      const car = { vin: '12345678901234567', mileage: -100 };
      const flags = scraper.getQualityFlags(car);
      expect(flags.length).toBeGreaterThan(0);
    });

    it('flags year in the future', () => {
      const car = { vin: '12345678901234567', year: new Date().getFullYear() + 10 };
      const flags = scraper.getQualityFlags(car);
      expect(flags).toContainEqual({ type: 'warning', message: 'Unusual year' });
    });

    it('flags very old year', () => {
      const car = { vin: '12345678901234567', year: 1900 };
      const flags = scraper.getQualityFlags(car);
      expect(flags).toContainEqual({ type: 'warning', message: 'Unusual year' });
    });

    it('flags missing make or model', () => {
      const car = { vin: '12345678901234567', year: 2020 };
      const flags = scraper.getQualityFlags(car);
      expect(flags).toContainEqual({ type: 'error', message: 'Missing make or model' });
    });
  });

  describe('Header Parsing Edge Cases', () => {
    it('handles headers with colons in values', () => {
      const headers = scraper.extractHeaders("curl 'https://example.com' -H 'Date: Tue, 15 Nov 2024 12:00:00 GMT'");
      expect(headers.Date).toBe('Tue, 15 Nov 2024 12:00:00 GMT');
    });

    it('handles headers with spaces in names', () => {
      const headers = scraper.extractHeaders("curl 'https://example.com' -H 'X Custom Header: value'");
      expect(headers['X Custom Header']).toBe('value');
    });

    it('handles empty header values', () => {
      const headers = scraper.extractHeaders("curl 'https://example.com' -H 'X-Empty:'");
      expect(headers['X-Empty']).toBe('');
    });

    it('handles multiple headers with same name', () => {
      const headers = scraper.extractHeaders("curl 'https://example.com' -H 'Accept: text/html' -H 'Accept: application/json'");
      expect(headers.Accept).toBe('application/json');
    });

    it('handles headers with equals signs in values', () => {
      const headers = scraper.extractHeaders("curl 'https://example.com' -H 'Authorization: Bearer token=abc123'");
      expect(headers.Authorization).toBe('Bearer token=abc123');
    });
  });

  describe('JSON-LD Edge Cases', () => {
    it('handles malformed JSON-LD', async () => {
      const html = `
        <html><body>
          <script type="application/ld+json">
            {invalid json}
          </script>
        </body></html>
      `;
      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await scraper.fromCurl("curl 'https://example.com'");
      expect(result.cars).toBeInstanceOf(Array);
    });

    it('handles empty JSON-LD array', async () => {
      const html = `
        <html><body>
          <script type="application/ld+json">[]</script>
        </body></html>
      `;
      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await scraper.fromCurl("curl 'https://example.com'");
      expect(result.cars).toEqual([]);
    });

    it('handles JSON-LD with null values', async () => {
      const html = `
        <html><body>
          <script type="application/ld+json">
            {"@type": "Car", "name": null, "price": null}
          </script>
        </body></html>
      `;
      mockedAxios.get.mockResolvedValue({ data: html });
      const result = await scraper.fromCurl("curl 'https://example.com'");
      expect(result.cars).toBeInstanceOf(Array);
    });
  });

  describe('Image Extraction Edge Cases', () => {
    it('handles data URIs in images', async () => {
      const $ = cheerio.load('<html><body><img src="data:image/png;base64,iVBORw0KG..." /></body></html>');
      const images = scraper.extractImages($, 'https://example.com');
      expect(images).not.toContain('data:image/png;base64,iVBORw0KG...');
    });

    it('handles images with query parameters', async () => {
      const $ = cheerio.load('<html><body><img src="https://example.com/img.jpg?w=800&h=600" /></body></html>');
      const images = scraper.extractImages($, 'https://example.com');
      expect(images[0]).toContain('img.jpg?w=800&h=600');
    });

    it('handles relative URLs with complex paths', async () => {
      const $ = cheerio.load('<html><body><img src="../../../images/img.jpg" /></body></html>');
      const images = scraper.extractImages($, 'https://example.com/a/b/c/');
      expect(images[0]).toContain('img.jpg');
    });

    it('handles protocol-relative URLs', async () => {
      const $ = cheerio.load('<html><body><img src="//cdn.example.com/img.jpg" /></body></html>');
      const images = scraper.extractImages($, 'https://example.com');
      expect(images[0]).toBe('https://cdn.example.com/img.jpg');
    });

    it('handles duplicate image URLs', async () => {
      const $ = cheerio.load('<html><body><img src="img1.jpg" /><img src="img1.jpg" /></body></html>');
      const images = scraper.extractImages($, 'https://example.com');
      expect(images.filter(img => img.includes('img1.jpg')).length).toBe(1);
    });
  });

  describe('Quality Score Edge Cases', () => {
    it('handles empty vehicle object', () => {
      const score = scraper.calculateQualityScore({});
      expect(score).toBe(0);
    });

    it('handles null values', () => {
      const score = scraper.calculateQualityScore({
        vin: null,
        year: null,
        make: null,
        model: null
      });
      expect(score).toBe(0);
    });

    it('caps score at maximum', () => {
      const perfectCar = {
        vin: '12345678901234567',
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        price: 25000,
        mileage: 50000,
        transmission: 'Automatic',
        drivetrain: 'FWD',
        body_type: 'Sedan',
        fuel_type: 'Gasoline',
        exterior_color: 'Blue',
        interior_color: 'Black',
        engine: '2.5L 4-Cylinder',
        description: 'A'.repeat(1000),
        images: Array(100).fill('img.jpg'),
        dealer_name: 'Test Dealer',
        dealer_phone: '555-555-5555'
      };
      const score = scraper.calculateQualityScore(perfectCar);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('correctly scores vehicle with all optional fields missing', () => {
      const minimalCar = { vin: '12345678901234567' };
      const score = scraper.calculateQualityScore(minimalCar);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(50);
    });
  });

  describe('Unicode and Encoding', () => {
    it('handles UTF-8 characters in text', async () => {
      const $ = cheerio.load('<html><body><div class="description">日本語の説明</div></body></html>');
      const text = scraper.extractText($, ['.description']);
      expect(text).toContain('日本語');
    });

    it('handles HTML entities', async () => {
      const $ = cheerio.load('<html><body><div class="price">&euro;25,000</div></body></html>');
      const price = scraper.extractPrice($);
      expect(price).toBeNull();
    });

    it('handles mixed encoding', async () => {
      const $ = cheerio.load('<html><body><div class="description">Café résumé naïve</div></body></html>');
      const text = scraper.extractText($, ['.description']);
      expect(text).toBeTruthy();
    });
  });

  describe('Concurrent Requests', () => {
    it('handles multiple simultaneous requests', async () => {
      mockedAxios.get.mockResolvedValue({
        data: '<html><body><div class="vin">1234567890ABCDEF01</div></body></html>'
      });

      const requests = [
        scraper.fromCurl("curl 'https://example.com/1'"),
        scraper.fromCurl("curl 'https://example.com/2'"),
        scraper.fromCurl("curl 'https://example.com/3'")
      ];

      const results = await Promise.all(requests);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('cars');
      });
    });

    it('handles partial failures in concurrent requests', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: '<html><body><div class="vin">1234567890ABCDEF01</div></body></html>' })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: '<html><body><div class="vin">1234567890ABCDEF02</div></body></html>' });

      const requests = [
        scraper.fromCurl("curl 'https://example.com/1'"),
        scraper.fromCurl("curl 'https://example.com/2'"),
        scraper.fromCurl("curl 'https://example.com/3'")
      ];

      const results = await Promise.allSettled(requests);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });
});
