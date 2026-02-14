const scraper = require('../../scraper');
const axios = require('axios');
const cheerio = require('cheerio');

jest.mock('axios');
const mockedAxios = axios;

describe('Scraper Performance Benchmarks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useFakeTimers();
  });

  describe('Single Scrape Performance', () => {
    it('completes single scrape in under 1 second', async () => {
      const startTime = Date.now();

      mockedAxios.get.mockResolvedValue({
        data: '<html><body><div class="vin">1234567890ABCDEF01</div><div class="price">$25,000</div></body></html>'
      });

      await scraper.fromCurl("curl 'https://example.com/vehicle'", 'test-source');

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it('handles large HTML pages efficiently', async () => {
      const largeHtml = '<html><body>' +
        '<div class="vehicle">' +
        '<div class="vin">1234567890ABCDEF01</div>' +
        '<div class="price">$25,000</div>' +
        '</div>'.repeat(100) +
        '</body></html>';

      mockedAxios.get.mockResolvedValue({ data: largeHtml });

      const startTime = Date.now();
      await scraper.fromCurl("curl 'https://example.com/large'", 'test-source');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Batch Scrape Performance', () => {
    it('processes 10 scrapes in under 5 seconds', async () => {
      mockedAxios.get.mockResolvedValue({
        data: '<html><body><div class="vin">1234567890ABCDEF01</div></body></html>'
      });

      const startTime = Date.now();
      const promises = Array.from({ length: 10 }, (_, i) =>
        scraper.fromCurl(`curl 'https://example.com/${i}'`, 'test-source')
      );

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });

    it('maintains consistent performance across 50 concurrent scrapes', async () => {
      mockedAxios.get.mockResolvedValue({
        data: '<html><body><div class="vin">1234567890ABCDEF01</div></body></html>'
      });

      const durations = [];
      const batchSize = 10;

      for (let batch = 0; batch < 5; batch++) {
        const startTime = Date.now();
        const promises = Array.from({ length: batchSize }, (_, i) =>
          scraper.fromCurl(`curl 'https://example.com/${batch}-${i}'`, 'test-source')
        );

        await Promise.all(promises);
        durations.push(Date.now() - startTime);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(avgDuration).toBeLessThan(2000);
      expect(maxDuration).toBeLessThan(3000);
    });
  });

  describe('Memory Efficiency', () => {
    it('does not leak memory on repeated scrapes', async () => {
      mockedAxios.get.mockResolvedValue({
        data: '<html><body><div class="vin">1234567890ABCDEF01</div></body></html>'
      });

      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        await scraper.fromCurl(`curl 'https://example.com/${i}'`, 'test-source');
      }

      global.gc && global.gc();

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Allow some memory growth but not excessive
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  describe('Parsing Performance', () => {
    it('extracts data from 1000 elements in under 100ms', () => {
      const largeHtml = '<html><body>' +
        Array.from({ length: 1000 }, (_, i) =>
          `<div class="car"><div class="vin">VIN${i}</div><div class="price">$${i * 1000}</div></div>`
        ).join('') +
        '</body></html>';

      const $ = cheerio.load(largeHtml);

      const startTime = Date.now();
      const cars = [];
      $('.car').each((i, el) => {
        const $el = $(el);
        cars.push({
          vin: $el.find('.vin').text(),
          price: scraper.extractPrice($el)
        });
      });
      const duration = Date.now() - startTime;

      expect(cars.length).toBe(1000);
      expect(duration).toBeLessThan(100);
    });

    it('calculates quality score for 100 cars in under 50ms', () => {
      const cars = Array.from({ length: 100 }, (_, i) => ({
        vin: '12345678901234567',
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        price: 25000,
        mileage: 50000
      }));

      const startTime = Date.now();
      const scores = cars.map(car => scraper.calculateQualityScore(car));
      const duration = Date.now() - startTime;

      expect(scores.length).toBe(100);
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Header Parsing Performance', () => {
    it('parses 100 headers in under 10ms', () => {
      const curlCommand = Array.from({ length: 100 }, (_, i) =>
        `-H "X-Custom-${i}: value-${i}"`
      ).join(' ');

      const startTime = Date.now();
      const headers = scraper.extractHeaders(curlCommand);
      const duration = Date.now() - startTime;

      expect(Object.keys(headers).length).toBeGreaterThan(100);
      expect(duration).toBeLessThan(10);
    });

    it('extracts headers from complex curl command efficiently', () => {
      const complexCurl = `curl 'https://example.com' ` +
        Array.from({ length: 50 }, (_, i) =>
          `-H "X-Header-${i}: value-${i}"`
        ).join(' ') +
        ` --header "User-Agent: test"`;

      const startTime = Date.now();
      const headers = scraper.extractHeaders(complexCurl);
      const duration = Date.now() - startTime;

      expect(headers).toHaveProperty('User-Agent');
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Image Extraction Performance', () => {
    it('extracts 100 images in under 50ms', () => {
      const html = '<html><body>' +
        Array.from({ length: 100 }, (_, i) =>
          `<img src="https://example.com/img${i}.jpg" />`
        ).join('') +
        '</body></html>';

      const $ = cheerio.load(html);

      const startTime = Date.now();
      const images = scraper.extractImages($, 'https://example.com');
      const duration = Date.now() - startTime;

      expect(images.length).toBe(100);
      expect(duration).toBeLessThan(50);
    });

    it('deduplicates 1000 URLs efficiently', () => {
      const html = '<html><body>' +
        Array.from({ length: 1000 }, (_, i) =>
          `<img src="https://example.com/img${Math.floor(i / 10)}.jpg" />`
        ).join('') +
        '</body></html>';

      const $ = cheerio.load(html);

      const startTime = Date.now();
      const images = scraper.extractImages($, 'https://example.com');
      const duration = Date.now() - startTime;

      expect(images.length).toBeLessThan(1000); // Should deduplicate
      expect(duration).toBeLessThan(100);
    });
  });

  describe('JSON-LD Parsing Performance', () => {
    it('parses JSON-LD from 100 vehicles in under 200ms', () => {
      const jsonLdArray = Array.from({ length: 100 }, (_, i) => ({
        '@type': 'Car',
        name: `Vehicle ${i}`,
        vehicleIdentificationNumber: `1234567890123456${i}`,
        vehicleModelDate: 2020
      }));

      const html = `<html><body><script type="application/ld+json">${JSON.stringify(jsonLdArray)}</script></body></html>`;
      const $ = cheerio.load(html);

      const startTime = Date.now();
      const cars = scraper.extractFromJsonLd($);
      const duration = Date.now() - startTime;

      expect(cars.length).toBe(100);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Quality Scoring Performance', () => {
    it('calculates 1000 quality scores in under 100ms', () => {
      const cars = Array.from({ length: 1000 }, (_, i) => ({
        vin: '12345678901234567',
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        price: 25000,
        mileage: 50000
      }));

      const startTime = Date.now();
      const scores = cars.map(car => scraper.calculateQualityScore(car));
      const duration = Date.now() - startTime;

      expect(scores.length).toBe(1000);
      expect(duration).toBeLessThan(100);
    });

    it('generates quality flags for 1000 cars in under 50ms', () => {
      const cars = Array.from({ length: 1000 }, (_, i) => ({
        vin: '12345678901234567',
        year: 2020,
        make: 'Toyota',
        model: 'Camry'
      }));

      const startTime = Date.now();
      const flags = cars.map(car => scraper.getQualityFlags(car));
      const duration = Date.now() - startTime;

      expect(flags.length).toBe(1000);
      expect(duration).toBeLessThan(50);
    });
  });

  describe('URL Discovery Performance', () => {
    it('discovers URLs from page with 1000 links in under 200ms', () => {
      const html = '<html><body>' +
        Array.from({ length: 1000 }, (_, i) =>
          `<a href="https://example.com/page${i}.html">Link ${i}</a>`
        ).join('') +
        '</body></html>';

      const $ = cheerio.load(html);

      const startTime = Date.now();
      const urls = [];
      $('a').each((i, el) => {
        urls.push($(el).attr('href'));
      });
      const duration = Date.now() - startTime;

      expect(urls.length).toBe(1000);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Concurrent Request Performance', () => {
    it('handles 50 concurrent requests efficiently', async () => {
      mockedAxios.get.mockResolvedValue({
        data: '<html><body><div class="vin">1234567890ABCDEF01</div></body></html>'
      });

      const startTime = Date.now();
      const promises = Array.from({ length: 50 }, (_, i) =>
        scraper.fromCurl(`curl 'https://example.com/${i}'`, 'test-source')
      );

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Scalability Benchmarks', () => {
    it('maintains sub-second response time for single scrape', async () => {
      mockedAxios.get.mockResolvedValue({
        data: '<html><body><div class="vin">1234567890ABCDEF01</div></body></html>'
      });

      const durations = [];
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        await scraper.fromCurl(`curl 'https://example.com/${i}'`, 'test-source');
        durations.push(Date.now() - startTime);
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(avgDuration).toBeLessThan(100);
    });

    it('scales linearly with batch size', async () => {
      mockedAxios.get.mockResolvedValue({
        data: '<html><body><div class="vin">1234567890ABCDEF01</div></body></html>'
      });

      const batchSize5 = Array.from({ length: 5 }, (_, i) =>
        scraper.fromCurl(`curl 'https://example.com/5-${i}'`, 'test-source')
      );
      const batchSize20 = Array.from({ length: 20 }, (_, i) =>
        scraper.fromCurl(`curl 'https://example.com/20-${i}'`, 'test-source')
      );

      const startTime5 = Date.now();
      await Promise.all(batchSize5);
      const duration5 = Date.now() - startTime5;

      const startTime20 = Date.now();
      await Promise.all(batchSize20);
      const duration20 = Date.now() - startTime20;

      // 20 requests should take roughly 4x longer than 5 requests
      const ratio = duration20 / duration5;
      expect(ratio).toBeLessThan(6); // Allow some overhead
    });
  });
});
