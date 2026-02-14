const scraper = require('../../scraper');
const axios = require('axios');
const cheerio = require('cheerio');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('CarScraper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fromCurl', () => {
    const validCurl = `curl 'https://example.com/vehicle' -H 'User-Agent: test'`;
    const curlWithHeaders = `curl 'https://example.com/vehicle' \\
      -H 'User-Agent: Mozilla/5.0' \\
      -H 'Accept: text/html' \\
      -H 'Cookie: session=abc123'`;
    const invalidCurl = 'not a curl command';

    it('should extract URL from curl command and fetch page', async () => {
      const mockHtml = '<html><body><div class="vin">1234567890ABCDEF01</div></body></html>';
      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scraper.fromCurl(validCurl, 'test-source');

      expect(result).toHaveProperty('source', 'test-source');
      expect(result).toHaveProperty('url', 'https://example.com/vehicle');
      expect(result).toHaveProperty('cars');
      expect(Array.isArray(result.cars)).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com/vehicle',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String)
          }),
          timeout: 30000
        })
      );
    });

    it('should extract custom headers from curl command', async () => {
      const mockHtml = '<html><body></body></html>';
      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      await scraper.fromCurl(curlWithHeaders, 'test-source');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com/vehicle',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'text/html',
            'Cookie': 'session=abc123'
          })
        })
      );
    });

    it('should throw error when URL cannot be extracted', async () => {
      await expect(scraper.fromCurl(invalidCurl))
        .rejects.toThrow('Could not extract URL from curl command');
    });

    it('should add default User-Agent header when not present', async () => {
      const curlWithoutUA = `curl 'https://example.com/vehicle'`;
      const mockHtml = '<html><body></body></html>';
      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      await scraper.fromCurl(curlWithoutUA);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com/vehicle',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla')
          })
        })
      );
    });

    it('should use provided source name', async () => {
      const mockHtml = '<html><body></body></html>';
      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scraper.fromCurl(validCurl, 'Custom Dealership');

      expect(result.source).toBe('Custom Dealership');
    });

    it('should use default source name when not provided', async () => {
      const mockHtml = '<html><body></body></html>';
      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await scraper.fromCurl(validCurl);

      expect(result.source).toBe('unknown');
    });

    it('should handle network errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(scraper.fromCurl(validCurl))
        .rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('timeout of 30000ms exceeded'));

      await expect(scraper.fromCurl(validCurl))
        .rejects.toThrow();
    });
  });

  describe('extractHeaders', () => {
    it('should extract single header with -H flag', () => {
      const curl = `curl 'https://example.com' -H 'Accept: application/json'`;
      const headers = scraper.extractHeaders(curl);

      expect(headers).toHaveProperty('Accept', 'application/json');
    });

    it('should extract multiple headers with -H flag', () => {
      const curl = `curl 'https://example.com' \\
        -H 'Accept: application/json' \\
        -H 'Authorization: Bearer token123'`;
      const headers = scraper.extractHeaders(curl);

      expect(headers).toHaveProperty('Accept', 'application/json');
      expect(headers).toHaveProperty('Authorization', 'Bearer token123');
    });

    it('should extract headers with --header flag', () => {
      const curl = `curl 'https://example.com' --header 'X-Custom: value'`;
      const headers = scraper.extractHeaders(curl);

      expect(headers).toHaveProperty('X-Custom', 'value');
    });

    it('should handle headers with colons in values', () => {
      const curl = `curl 'https://example.com' -H 'Date: Tue, 15 Nov 2024 12:00:00 GMT'`;
      const headers = scraper.extractHeaders(curl);

      expect(headers).toHaveProperty('Date', 'Tue, 15 Nov 2024 12:00:00 GMT');
    });

    it('should add default User-Agent when not present', () => {
      const curl = `curl 'https://example.com' -H 'Accept: text/html'`;
      const headers = scraper.extractHeaders(curl);

      expect(headers).toHaveProperty('User-Agent');
      expect(headers['User-Agent']).toContain('Mozilla');
    });

    it('should not override User-Agent when already present', () => {
      const curl = `curl 'https://example.com' -H 'User-Agent: CustomAgent/1.0'`;
      const headers = scraper.extractHeaders(curl);

      expect(headers).toHaveProperty('User-Agent', 'CustomAgent/1.0');
    });
  });

  describe('isVdp', () => {
    it('should identify VDP when VIN is present', () => {
      const $ = cheerio.load('<html><body><div class="vin">1234567890ABCDEF01</div></body></html>');

      expect(scraper.isVdp($)).toBe(true);
    });

    it('should identify VDP when stock number is present', () => {
      const $ = cheerio.load('<html><body><div class="stock">ABC123</div></body></html>');

      expect(scraper.isVdp($)).toBe(true);
    });

    it('should identify VDP when price is present', () => {
      const $ = cheerio.load('<html><body><div class="price">$25,000</div></body></html>');

      expect(scraper.isVdp($)).toBe(true);
    });

    it('should identify VDP when mileage is present', () => {
      const $ = cheerio.load('<html><body><div class="mileage">45,000 mi</div></body></html>');

      expect(scraper.isVdp($)).toBe(true);
    });

    it('should not identify non-VDP pages', () => {
      const $ = cheerio.load('<html><body><div class="results">No vehicles here</div></body></html>');

      expect(scraper.isVdp($)).toBe(false);
    });

    it('should identify VDP from JSON-LD data', () => {
      const html = `
        <html><body>
          <script type="application/ld+json">
            {"@type": "Car", "name": "Test Vehicle"}
          </script>
        </body></html>
      `;
      const $ = cheerio.load(html);

      expect(scraper.isVdp($)).toBe(true);
    });

    it('should require multiple VDP indicators', () => {
      const $ = cheerio.load('<html><body><div class="price">$25,000</div></body></html>');

      // Only 1 indicator, not enough
      expect(scraper.isVdp($)).toBe(false);
    });
  });

  describe('isSrp', () => {
    it('should identify SRP with vehicle class', () => {
      const $ = cheerio.load(`
        <html><body>
          <div class="vehicle">Car 1</div>
          <div class="vehicle">Car 2</div>
          <div class="vehicle">Car 3</div>
        </body></html>
      `);

      expect(scraper.isSrp($)).toBe(true);
    });

    it('should identify SRP with inventory-item class', () => {
      const $ = cheerio.load(`
        <html><body>
          <div class="inventory-item">Car 1</div>
          <div class="inventory-item">Car 2</div>
          <div class="inventory-item">Car 3</div>
        </body></html>
      `);

      expect(scraper.isSrp($)).toBe(true);
    });

    it('should identify SRP when inventory text is present', () => {
      const $ = cheerio.load('<html><body><p>View our inventory of vehicles</p></body></html>');

      expect(scraper.isSrp($)).toBe(true);
    });

    it('should require minimum 3 vehicle cards', () => {
      const $ = cheerio.load(`
        <html><body>
          <div class="vehicle">Car 1</div>
          <div class="vehicle">Car 2</div>
        </body></html>
      `);

      expect(scraper.isSrp($)).toBe(false);
    });
  });

  describe('extractText', () => {
    it('should extract text from selector', () => {
      const $ = cheerio.load('<html><body><div class="vin">1234567890ABCDEF01</div></body></html>');

      expect(scraper.extractText($, ['.vin'])).toBe('1234567890ABCDEF01');
    });

    it('should extract text from data attribute', () => {
      const $ = cheerio.load('<html><body><div data-vin="1234567890ABCDEF01"></div></body></html>');

      expect(scraper.extractText($, ['[data-vin]'])).toBe('1234567890ABCDEF01');
    });

    it('should try multiple selectors in order', () => {
      const $ = cheerio.load('<html><body><p class="stock">ABC123</p></body></html>');

      expect(scraper.extractText($, ['.missing', '.stock'])).toBe('ABC123');
    });

    it('should return null when no match found', () => {
      const $ = cheerio.load('<html><body><div class="other">Data</div></body></html>');

      expect(scraper.extractText($, ['.missing'])).toBeNull();
    });

    it('should extract text with colon from contains selector', () => {
      const $ = cheerio.load('<html><body><p>VIN: 1234567890ABCDEF01</p></body></html>');

      expect(scraper.extractText($, ['*:contains("VIN")'])).toBe('1234567890ABCDEF01');
    });

    it('should handle multiline text', () => {
      const $ = cheerio.load('<html><body><p class="desc">Line 1\nLine 2\nLine 3</p></body></html>');

      const result = scraper.extractText($, ['.desc'], true);
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });
  });

  describe('extractPrice', () => {
    it('should extract price with dollar sign and comma', () => {
      const $ = cheerio.load('<html><body><div class="price">$25,995</div></body></html>');

      expect(scraper.extractPrice($)).toBe(25995);
    });

    it('should extract price with dollar sign only', () => {
      const $ = cheerio.load('<html><body><div class="price">$15000</div></body></html>');

      expect(scraper.extractPrice($)).toBe(15000);
    });

    it('should extract price with cents', () => {
      const $ = cheerio.load('<html><body><div class="price">$25,995.50</div></body></html>');

      expect(scraper.extractPrice($)).toBe(25995.50);
    });

    it('should return null for non-price text', () => {
      const $ = cheerio.load('<html><body><div class="price">Contact for Price</div></body></html>');

      expect(scraper.extractPrice($)).toBeNull();
    });

    it('should return null when price element missing', () => {
      const $ = cheerio.load('<html><body><div class="other">Data</div></body></html>');

      expect(scraper.extractPrice($)).toBeNull();
    });
  });

  describe('extractYear', () => {
    it('should extract 4-digit year', () => {
      const $ = cheerio.load('<html><body><div class="year">2023</div></body></html>');

      expect(scraper.extractYear($)).toBe(2023);
    });

    it('should extract year from 2000s', () => {
      const $ = cheerio.load('<html><body><div class="year">2008</div></body></html>');

      expect(scraper.extractYear($)).toBe(2008);
    });

    it('should return null for non-year text', () => {
      const $ = cheerio.load('<html><body><div class="year">N/A</div></body></html>');

      expect(scraper.extractYear($)).toBeNull();
    });

    it('should return null for years outside valid range', () => {
      const $ = cheerio.load('<html><body><div class="year">1800</div></body></html>');

      expect(scraper.extractYear($)).toBeNull();
    });
  });

  describe('extractMileage', () => {
    it('should extract mileage with comma', () => {
      const $ = cheerio.load('<html><body><div class="mileage">45,000 mi</div></body></html>');

      expect(scraper.extractMileage($)).toBe(45000);
    });

    it('should extract mileage without comma', () => {
      const $ = cheerio.load('<html><body><div class="odometer">12345 mi</div></body></html>');

      expect(scraper.extractMileage($)).toBe(12345);
    });

    it('should return null for non-mileage text', () => {
      const $ = cheerio.load('<html><body><div class="mileage">New</div></body></html>');

      expect(scraper.extractMileage($)).toBeNull();
    });
  });

  describe('parseMakeModel', () => {
    it('should parse Year Make Model pattern', () => {
      const result = scraper.parseMakeModel('2023 Toyota Camry');

      expect(result.make).toBe('Toyota');
      expect(result.model).toBe('Camry');
      expect(result.trim).toBeNull();
    });

    it('should parse Year Make Model - Trim pattern', () => {
      const result = scraper.parseMakeModel('2023 Toyota Camry - XSE');

      expect(result.make).toBe('Toyota');
      expect(result.model).toBe('Camry');
      expect(result.trim).toBe('XSE');
    });

    it('should parse Make Model pattern', () => {
      const result = scraper.parseMakeModel('Ford F-150');

      expect(result.make).toBe('Ford');
      expect(result.model).toBe('F-150');
      expect(result.trim).toBeNull();
    });

    it('should handle complex model names', () => {
      const result = scraper.parseMakeModel('2021 RAM 1500 Limited');

      expect(result.make).toBe('RAM');
      expect(result.model).toBe('1500');
      expect(result.trim).toBe('Limited');
    });
  });

  describe('calculateQualityScore', () => {
    it('should give high score for complete data', () => {
      const car = {
        vin: '1234567890ABCDEF01',
        year: 2023,
        make: 'Toyota',
        model: 'Camry',
        price: 25000,
        mileage: 15000,
        transmission: 'Automatic',
        drivetrain: 'FWD',
        body_type: 'Sedan',
        fuel_type: 'Gasoline',
        exterior_color: 'Blue',
        interior_color: 'Black',
        engine: '2.5L 4-Cylinder',
        description: 'Well-maintained vehicle',
        images: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
        dealer_name: 'Test Dealership',
        dealer_phone: '555-123-4567'
      };

      const score = scraper.calculateQualityScore(car);

      expect(score).toBeGreaterThan(80);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give low score for sparse data', () => {
      const car = {
        vin: '1234567890ABCDEF01',
        year: 2023
      };

      const score = scraper.calculateQualityScore(car);

      expect(score).toBeLessThan(50);
    });

    it('should penalize missing VIN', () => {
      const car = {
        year: 2023,
        make: 'Toyota',
        model: 'Camry',
        price: 25000
      };

      const score = scraper.calculateQualityScore(car);

      expect(score).toBeLessThan(90); // Should lose 10 points for missing VIN
    });

    it('should penalize unusual price', () => {
      const car = {
        vin: '1234567890ABCDEF01',
        year: 2023,
        make: 'Toyota',
        model: 'Camry',
        price: 500000 // Unusually high
      };

      const score = scraper.calculateQualityScore(car);

      // Should still have points for other fields, but lose 10 for invalid price range
      expect(score).toBeLessThan(90);
    });
  });

  describe('getQualityFlags', () => {
    it('should flag missing VIN', () => {
      const car = {
        year: 2023,
        make: 'Toyota',
        model: 'Camry'
      };

      const flags = scraper.getQualityFlags(car);

      expect(flags).toContainEqual({
        type: 'error',
        message: 'Missing make or model'
      });
    });

    it('should flag invalid VIN length', () => {
      const car = {
        vin: '123', // Too short
        year: 2023
      };

      const flags = scraper.getQualityFlags(car);

      expect(flags).toContainEqual({
        type: 'error',
        message: 'Invalid VIN length'
      });
    });

    it('should flag missing price', () => {
      const car = {
        vin: '1234567890ABCDEF01',
        year: 2023
      };

      const flags = scraper.getQualityFlags(car);

      expect(flags).toContainEqual({
        type: 'warning',
        message: 'Missing price'
      });
    });

    it('should flag unusual price', () => {
      const car = {
        vin: '1234567890ABCDEF01',
        year: 2023,
        price: -1000
      };

      const flags = scraper.getQualityFlags(car);

      expect(flags).toContainEqual({
        type: 'warning',
        message: 'Unusual price'
      });
    });

    it('should flag no images', () => {
      const car = {
        vin: '1234567890ABCDEF01',
        year: 2023,
        images: []
      };

      const flags = scraper.getQualityFlags(car);

      expect(flags).toContainEqual({
        type: 'info',
        message: 'No images'
      });
    });
  });

  describe('extractFromJsonLd', () => {
    it('should extract car data from JSON-LD Car object', () => {
      const html = `
        <html><body>
          <script type="application/ld+json">
            {
              "@type": "Car",
              "name": "2023 Toyota Camry",
              "vehicleIdentificationNumber": "1234567890ABCDEF01",
              "mileageFromOdometer": {"value": 15000},
              "offers": {"price": 25000}
            }
          }
        </script>
        </body></html>
      `;
      const $ = cheerio.load(html);
      const cars = scraper.extractFromJsonLd($);

      expect(cars).toHaveLength(1);
      expect(cars[0]).toMatchObject({
        vin: '1234567890ABCDEF01',
        mileage: 15000,
        price: 25000
      });
    });

    it('should extract car data from JSON-LD Vehicle object', () => {
      const html = `
        <html><body>
          <script type="application/ld+json">
            {
              "@type": "Vehicle",
              "name": "2023 Ford F-150"
            }
          </script>
        </body></html>
      `;
      const $ = cheerio.load(html);
      const cars = scraper.extractFromJsonLd($);

      expect(cars).toHaveLength(1);
      expect(cars[0]).toHaveProperty('_qualityScore');
      expect(cars[0]).toHaveProperty('_qualityFlags');
    });

    it('should handle JSON-LD arrays', () => {
      const html = `
        <html><body>
          <script type="application/ld+json">
            [
              {"@type": "Car", "name": "Car 1"},
              {"@type": "Car", "name": "Car 2"}
            ]
          </script>
        </body></html>
      `;
      const $ = cheerio.load(html);
      const cars = scraper.extractFromJsonLd($);

      expect(cars).toHaveLength(2);
    });

    it('should ignore non-Car JSON-LD objects', () => {
      const html = `
        <html><body>
          <script type="application/ld+json">
            {"@type": "WebSite", "name": "Test Site"}
          </script>
        </body></html>
      `;
      const $ = cheerio.load(html);
      const cars = scraper.extractFromJsonLd($);

      expect(cars).toHaveLength(0);
    });

    it('should handle malformed JSON-LD gracefully', () => {
      const html = `
        <html><body>
          <script type="application/ld+json">
            {invalid json}
          </script>
        </body></html>
      `;
      const $ = cheerio.load(html);

      // Should not throw
      expect(() => scraper.extractFromJsonLd($)).not.toThrow();
    });
  });

  describe('extractImages', () => {
    it('should extract absolute URLs', () => {
      const html = `
        <html><body>
          <img src="https://example.com/img1.jpg" />
          <img src="https://example.com/img2.jpg" />
        </body></html>
      `;
      const $ = cheerio.load(html);

      const images = scraper.extractImages($, 'https://example.com');

      expect(images).toContain('https://example.com/img1.jpg');
      expect(images).toContain('https://example.com/img2.jpg');
    });

    it('should resolve relative URLs', () => {
      const html = `
        <html><body>
          <img src="/images/img1.jpg" />
        </body></html>
      `;
      const $ = cheerio.load(html);

      const images = scraper.extractImages($, 'https://example.com/vehicle');

      expect(images).toContain('https://example.com/images/img1.jpg');
    });

    it('should filter out placeholder images', () => {
      const html = `
        <html><body>
          <img src="https://example.com/real.jpg" />
          <img src="https://example.com/placeholder.jpg" />
          <img src="https://example.com/spinner.png" />
        </body></html>
      `;
      const $ = cheerio.load(html);

      const images = scraper.extractImages($, 'https://example.com');

      expect(images).not.toContain('https://example.com/placeholder.jpg');
      expect(images).not.toContain('https://example.com/spinner.png');
      expect(images).toContain('https://example.com/real.jpg');
    });

    it('should return only first image when single=true', () => {
      const html = `
        <html><body>
          <img src="https://example.com/img1.jpg" />
          <img src="https://example.com/img2.jpg" />
        </body></html>
      `;
      const $ = cheerio.load(html);

      const images = scraper.extractImages($, 'https://example.com', true);

      expect(images).toHaveLength(1);
    });
  });

  describe('extractFeatures', () => {
    it('should extract features from list items', () => {
      const html = `
        <html><body>
          <ul class="features">
            <li>Bluetooth</li>
            <li>Backup Camera</li>
            <li>Navigation</li>
          </ul>
        </body></html>
      `;
      const $ = cheerio.load(html);

      const features = scraper.extractFeatures($);

      expect(features).toContain('Bluetooth');
      expect(features).toContain('Backup Camera');
      expect(features).toContain('Navigation');
    });

    it('should extract unique features only', () => {
      const html = `
        <html><body>
          <ul class="features">
            <li>Bluetooth</li>
            <li>Bluetooth</li>
            <li>Bluetooth</li>
          </ul>
        </body></html>
      `;
      const $ = cheerio.load(html);

      const features = scraper.extractFeatures($);

      expect(features).toHaveLength(1);
      expect(features[0]).toBe('Bluetooth');
    });

    it('should filter out overly long features', () => {
      const html = `
        <html><body>
          <ul class="features">
            <li>Short feature</li>
            <li>${'a'.repeat(300)}</li>
          </ul>
        </body></html>
      `;
      const $ = cheerio.load(html);

      const features = scraper.extractFeatures($);

      expect(features).toContain('Short feature');
      expect(features).not.toContain('a'.repeat(300));
    });
  });
});
