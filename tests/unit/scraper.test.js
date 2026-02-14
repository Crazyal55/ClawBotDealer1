const scraper = require('../../scraper');
const axios = require('axios');
const cheerio = require('cheerio');

jest.mock('axios');
const mockedAxios = axios;

describe('CarScraper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fromCurl', () => {
    it('extracts URL and calls axios with parsed headers', async () => {
      mockedAxios.get.mockResolvedValue({ data: '<html><body></body></html>' });

      const result = await scraper.fromCurl(
        "curl 'https://example.com/vehicle' -H 'User-Agent: test-agent'",
        'source-a'
      );

      expect(result.source).toBe('source-a');
      expect(result.url).toBe('https://example.com/vehicle');
      expect(Array.isArray(result.cars)).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com/vehicle',
        expect.objectContaining({
          headers: expect.objectContaining({ 'User-Agent': 'test-agent' }),
          timeout: 30000
        })
      );
    });

    it('throws when curl URL cannot be parsed', async () => {
      await expect(scraper.fromCurl('curl')).rejects.toThrow('Could not extract URL from curl command');
    });
  });

  describe('extractHeaders', () => {
    it('parses -H and --header flags', () => {
      const headers = scraper.extractHeaders(
        "curl 'https://example.com' -H 'Accept: text/html' --header 'X-Test: 1'"
      );

      expect(headers.Accept).toBe('text/html');
      expect(headers['X-Test']).toBe('1');
      expect(headers['User-Agent']).toBeTruthy();
    });
  });

  describe('VDP/SRP detection', () => {
    it('requires multiple VDP indicators', () => {
      const $single = cheerio.load('<html><body><div>VIN: 123</div></body></html>');
      const $multi = cheerio.load('<html><body>VIN 123 stock number XYZ price $25000</body></html>');

      expect(scraper.isVdp($single)).toBe(false);
      expect(scraper.isVdp($multi)).toBe(true);
    });

    it('identifies SRP with 3+ vehicle cards', () => {
      const $ = cheerio.load('<div class="vehicle"></div><div class="vehicle"></div><div class="vehicle"></div>');
      expect(scraper.isSrp($)).toBe(true);
    });
  });

  describe('extractors', () => {
    it('extracts numeric price, year, and mileage', () => {
      const $ = cheerio.load(`
        <div class="price">$25,995</div>
        <div class="year">2022</div>
        <div class="mileage">45,000 mi</div>
      `);

      expect(scraper.extractPrice($)).toBe(25995);
      expect(scraper.extractYear($)).toBe(2022);
      expect(scraper.extractMileage($)).toBe(45000);
    });

    it('normalizes make/model/trim parsing', () => {
      expect(scraper.parseMakeModel('2023 Toyota Camry')).toEqual({
        make: 'Toyota',
        model: 'Camry',
        trim: ''
      });
      expect(scraper.parseMakeModel('2023 Toyota Camry - XSE')).toEqual({
        make: 'Toyota',
        model: 'Camry',
        trim: 'XSE'
      });
    });
  });

  describe('quality scoring', () => {
    it('returns higher score for complete vehicle records', () => {
      const low = scraper.calculateQualityScore({ year: 2020, make: 'Toyota' });
      const high = scraper.calculateQualityScore({
        vin: '1HGCM82633A004352',
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        price: 21000,
        mileage: 24000,
        transmission: 'Automatic',
        drivetrain: 'FWD',
        body_type: 'Sedan',
        fuel_type: 'Gasoline',
        exterior_color: 'Blue',
        interior_color: 'Black',
        engine: '2.5L I4',
        description: 'One owner, clean history, fresh service completed recently.',
        images: ['a.jpg', 'b.jpg', 'c.jpg'],
        dealer_name: 'Dealer A',
        dealer_phone: '555-555-5555'
      });

      expect(high).toBeGreaterThan(low);
    });

    it('flags missing VIN and price', () => {
      const flags = scraper.getQualityFlags({ year: 2018, make: 'Toyota', model: 'Corolla' });
      expect(flags).toContainEqual({ type: 'warning', message: 'Missing VIN' });
      expect(flags).toContainEqual({ type: 'warning', message: 'Missing price' });
    });
  });
});
