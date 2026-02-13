const axios = require('axios');
const cheerio = require('cheerio');

class CarScraper {
  async fromCurl(curlCommand, sourceName = 'unknown') {
    // Parse curl command to extract URL
    const urlMatch = curlCommand.match(/curl\s+['"]?([^'"\s]+)['"]?/i);
    if (!urlMatch) {
      throw new Error('Could not extract URL from curl command');
    }

    const url = urlMatch[1];

    // Extract headers from curl if present
    const headers = this.extractHeaders(curlCommand);

    // Fetch the page
    const response = await axios.get(url, { headers, timeout: 30000 });

    // Parse and extract car data
    const cars = this.extractCars(response.data, url);

    return {
      source: sourceName,
      url: url,
      cars: cars
    };
  }

  extractHeaders(curlCommand) {
    const headers = {};

    // Extract -H or --header flags
    const headerRegex = /-H\s+['"]([^'"]+)['"]|--header\s+['"]([^'"]+)['"]/gi;
    let match;

    while ((match = headerRegex.exec(curlCommand)) !== null) {
      const headerLine = match[1] || match[2];
      const [key, ...valueParts] = headerLine.split(':');
      if (key && valueParts.length > 0) {
        headers[key.trim()] = valueParts.join(':').trim();
      }
    }

    // Default User-Agent if not present
    if (!headers['User-Agent']) {
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    return headers;
  }

  extractCars(html, sourceUrl) {
    const $ = cheerio.load(html);
    const cars = [];

    // Try to detect page type and use appropriate extraction
    if (this.isVdp($)) {
      // Vehicle Detail Page - single car
      const car = this.extractSingleCar($, sourceUrl);
      if (car) cars.push(car);
    } else if (this.isSrp($)) {
      // Search Results Page - multiple cars
      const extractedCars = this.extractMultipleCars($, sourceUrl);
      cars.push(...extractedCars);
    } else {
      // Try JSON-LD data
      const jsonLdCars = this.extractFromJsonLd($);
      cars.push(...jsonLdCars);
    }

    return cars;
  }

  isVdp($) {
    // Check for single vehicle page indicators
    const vdpIndicators = [
      'vin',
      'vehicle identification number',
      'stock number',
      'price',
      'mileage'
    ];

    const bodyText = $('body').text().toLowerCase();
    const vdpCount = vdpIndicators.filter(indicator => bodyText.includes(indicator)).length;

    // Also check for structured data
    const jsonLd = $('script[type="application/ld+json"]');
    let hasVehicleData = false;
    jsonLd.each((i, el) => {
      try {
        const data = JSON.parse($(el).html());
        if (data['@type'] === 'Car' || data['@type'] === 'Vehicle') {
          hasVehicleData = true;
        }
      } catch (e) {}
    });

    return vdpCount >= 3 || hasVehicleData;
  }

  isSrp($) {
    // Check for search results page indicators
    const srpIndicators = [
      'vehicle',
      'inventory',
      'results',
      'showing'
    ];

    const bodyText = $('body').text().toLowerCase();
    const srpCount = srpIndicators.filter(indicator => bodyText.includes(indicator)).length;

    // Count potential vehicle cards
    const vehicleCards = $('.vehicle, .car-card, .inventory-item, .vehicle-item, [class*="vehicle"], [class*="inventory"]').length;

    return srpCount >= 2 || vehicleCards >= 3;
  }

  extractSingleCar($, url) {
    const car = {
      url: url,
      raw_data: { html: $.html().substring(0, 50000) } // Limit raw data size
    };

    // Extract VIN
    car.vin = this.extractText($, [
      '.vin',
      '[data-vin]',
      '.vehicle-identification-number',
      '*:contains("VIN")',
      '*:contains("Vehicle Identification Number")'
    ]);

    // Extract stock number
    car.stock_number = this.extractText($, [
      '.stock-number',
      '[data-stock]',
      '*:contains("Stock")'
    ]);

    // Extract price
    car.price = this.extractPrice($);

    // Extract year
    car.year = this.extractYear($);

    // Extract make/model
    const makeModel = this.extractMakeModel($);
    car.make = makeModel.make;
    car.model = makeModel.model;
    car.trim = makeModel.trim;

    // Extract mileage
    car.mileage = this.extractMileage($);

    // Extract colors
    car.exterior_color = this.extractText($, [
      '.exterior-color',
      '.color-exterior',
      '*:contains("Exterior Color")'
    ]);

    car.interior_color = this.extractText($, [
      '.interior-color',
      '.color-interior',
      '*:contains("Interior Color")'
    ]);

    // Extract vehicle details
    car.body_type = this.extractText($, [
      '.body-type',
      '.body-style',
      '*:contains("Body Style")',
      '*:contains("Body Type")'
    ]);

    car.transmission = this.extractText($, [
      '.transmission',
      '*:contains("Transmission")'
    ]);

    car.drivetrain = this.extractText($, [
      '.drivetrain',
      '*:contains("Drivetrain")',
      '*:contains("Drive Train")'
    ]);

    car.fuel_type = this.extractText($, [
      '.fuel-type',
      '*:contains("Fuel Type")'
    ]);

    car.engine = this.extractText($, [
      '.engine',
      '*:contains("Engine")'
    ]);

    car.mpg_city = this.extractNumber($, ['*:contains("City MPG")', '*:contains("MPG City")']);
    car.mpg_highway = this.extractNumber($, ['*:contains("Highway MPG")', '*:contains("MPG Highway")']);

    // Extract features
    car.features = this.extractFeatures($);

    // Extract description
    car.description = this.extractText($, [
      '.description',
      '.vehicle-description',
      '*:contains("Description")',
      '.details'
    ], true);

    // Extract images
    car.images = this.extractImages($, url);

    // Extract dealer info
    car.dealer_name = this.extractText($, [
      '.dealer-name',
      '.dealership-name',
      '.seller-name'
    ]);

    car.dealer_address = this.extractText($, [
      '.dealer-address',
      '.address'
    ]);

    car.dealer_phone = this.extractText($, [
      '.dealer-phone',
      '.phone',
      '*:contains("Phone")'
    ]);

    car.dealer_email = this.extractText($, [
      '.dealer-email',
      '.email'
    ]);

    // Clean up VIN if found
    if (car.vin) {
      car.vin = car.vin.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (car.vin.length !== 17) {
        car.vin = null; // Invalid VIN length
      }
    }

    return Object.fromEntries(Object.entries(car).filter(([_, v]) => v !== null && v !== undefined && v !== ''));
  }

  extractMultipleCars($, baseUrl) {
    const cars = [];

    // Try to find vehicle containers
    const selectors = [
      '.vehicle',
      '.car-card',
      '.inventory-item',
      '.vehicle-item',
      '.listing',
      '[class*="vehicle"]',
      '[class*="inventory"]',
      '[class*="listing"]'
    ];

    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length === 0) continue;

      elements.each((i, el) => {
        const $el = $(el);
        const car = this.extractFromCard($el, baseUrl);
        if (car && (car.year || car.make || car.price)) {
          cars.push(car);
        }
      });

      if (cars.length > 0) break;
    }

    return cars;
  }

  extractFromCard($el, baseUrl) {
    const car = { raw_data: {} };

    car.year = this.extractYear($el);
    const makeModel = this.extractMakeModel($el);
    car.make = makeModel.make;
    car.model = makeModel.model;
    car.trim = makeModel.trim;

    car.price = this.extractPrice($el);
    car.mileage = this.extractMileage($el);

    car.url = $el.find('a').first().attr('href');
    if (car.url && !car.url.startsWith('http')) {
      try {
        car.url = new URL(car.url, baseUrl).href;
      } catch (e) {}
    }

    car.images = this.extractImages($el, baseUrl, true);

    return Object.fromEntries(Object.entries(car).filter(([_, v]) => v !== null && v !== undefined && v !== ''));
  }

  extractFromJsonLd($) {
    const cars = [];

    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const data = JSON.parse($(el).html());

        if (Array.isArray(data)) {
          data.forEach(item => this.parseJsonLdCar(item, cars));
        } else {
          this.parseJsonLdCar(data, cars);
        }
      } catch (e) {}
    });

    return cars;
  }

  parseJsonLdCar(data, cars) {
    if (data['@type'] !== 'Car' && data['@type'] !== 'Vehicle') return;

    const car = {
      raw_data: { jsonLd: data }
    };

    car.vin = data.vehicleIdentificationNumber || data.vin;
    car.year = data.vehicleModelDate || data.modelYear;
    car.make = data.manufacturer?.name || data.brand?.name || data.manufacturer;
    car.model = data.model?.name || data.model;
    car.trim = data.vehicleConfiguration || data.trim;
    car.mileage = data.mileageFromOdometer?.value || data.mileageFromOdometer;
    car.price = data.offers?.price || data.price;
    car.body_type = data.bodyType;
    car.transmission = data.vehicleTransmission?.name || data.vehicleTransmission;
    car.drivetrain = data.driveWheelConfiguration?.name || data.driveWheelConfiguration;
    car.fuel_type = data.fuelType;
    car.description = data.description;
    car.url = data.url;
    car.images = [];

    if (data.image) {
      if (Array.isArray(data.image)) {
        car.images = data.image.map(img => typeof img === 'string' ? img : img.url);
      } else {
        car.images = [typeof data.image === 'string' ? data.image : data.image.url];
      }
    }

    const carData = Object.fromEntries(Object.entries(car).filter(([_, v]) => v !== null && v !== undefined && v !== ''));
    carData._qualityScore = this.calculateQualityScore(carData);
    carData._qualityFlags = this.getQualityFlags(carData);

    cars.push(carData);
  }

  extractText($, selectors, multiline = false) {
    for (const selector of selectors) {
      if (selector.includes(':contains')) {
        // Handle :contains pseudo-selector
        const parts = selector.split(':contains(');
        const baseSelector = parts[0] || '*';
        const searchText = parts[1]?.replace(/['"]?\)/, '');

        $(baseSelector).each((i, el) => {
          const text = $(el).text();
          if (text.toLowerCase().includes(searchText.toLowerCase())) {
            // Try to find the value (text after the label)
            const parent = $(el).parent();
            const fullText = parent.text();

            // Common patterns: "Label: Value", "Label Value", etc.
            const patterns = [
              new RegExp(`[:\\s]+(.+)`, 'i'),
              new RegExp(`${searchText}[\\s:]+(.+)`, 'i')
            ];

            for (const pattern of patterns) {
              const match = fullText.match(pattern);
              if (match && match[1]) {
                const value = match[1].trim().substring(0, 200);
                if (value && value.toLowerCase() !== searchText.toLowerCase()) {
                  return multiline ? value : value.split('\n')[0].trim();
                }
              }
            }
          }
        });
      } else {
        const $el = $(selector);
        if ($el.length > 0) {
          const text = $el.first().text().trim();
          if (text) return multiline ? text : text.split('\n')[0].trim();
        }
      }
    }
    return null;
  }

  extractPrice($) {
    const text = this.extractText($, [
      '.price',
      '[data-price]',
      '.vehicle-price',
      '.listing-price',
      '*:contains("$")'
    ]);

    if (!text) return null;

    const match = text.match(/\$?[\d,]+\.?\d*/);
    if (match) {
      return parseFloat(match[0].replace(/[\$,]/g, ''));
    }
    return null;
  }

  extractYear($) {
    const text = this.extractText($, [
      '.year',
      '[data-year]',
      '.vehicle-year',
      '*:contains("20")'
    ]);

    if (!text) return null;

    const match = text.match(/20\d{2}/);
    if (match) return parseInt(match[0]);

    return null;
  }

  extractMakeModel($) {
    const result = { make: null, model: null, trim: null };

    // Try title or heading first
    const titleText = this.extractText($, [
      'h1',
      '.title',
      '.vehicle-title',
      'h2'
    ]);

    if (titleText) {
      const parsed = this.parseMakeModel(titleText);
      result.make = parsed.make;
      result.model = parsed.model;
      result.trim = parsed.trim;
    }

    // Fallback to individual elements
    if (!result.make) {
      result.make = this.extractText($, ['.make', '[data-make]', '*:contains("Make")']);
    }

    if (!result.model) {
      result.model = this.extractText($, ['.model', '[data-model]', '*:contains("Model")']);
    }

    if (!result.trim) {
      result.trim = this.extractText($, ['.trim', '[data-trim]', '*:contains("Trim")']);
    }

    return result;
  }

  parseMakeModel(text) {
    const result = { make: null, model: null, trim: null };

    // Common patterns: "2023 Toyota Camry XSE", "Toyota Camry - XSE"
    const patterns = [
      /20\d{2}\s+(\w+)\s+(.+?)(?:\s+-\s*|\s+)(.+)/, // Year Make Model - Trim
      /20\d{2}\s+(\w+)\s+(.+)/, // Year Make Model
      /(\w+)\s+(.+?)(?:\s+-\s*|\s+)(.+)/, // Make Model - Trim
      /(\w+)\s+(.+)/ // Make Model
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[1].match(/^\d{4}$/)) {
          result.make = match[2];
          result.model = match[3].split(/\s+/)[0];
          result.trim = match[4] || match[3].split(/\s+/).slice(1).join(' ');
        } else {
          result.make = match[1];
          result.model = match[2].split(/\s+/)[0];
          result.trim = match[3] || match[2].split(/\s+/).slice(1).join(' ');
        }
        break;
      }
    }

    return result;
  }

  extractMileage($) {
    const text = this.extractText($, [
      '.mileage',
      '[data-mileage]',
      '.odometer',
      '*:contains("mi")',
      '*:contains("miles")'
    ]);

    if (!text) return null;

    const match = text.match(/[\d,]+/);
    if (match) {
      return parseInt(match[0].replace(/,/g, ''));
    }
    return null;
  }

  extractNumber($, selectors) {
    const text = this.extractText($, selectors);
    if (!text) return null;

    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  extractFeatures($) {
    const features = new Set();

    // Try common feature selectors
    const featureSelectors = [
      '.features li',
      '.feature-list li',
      '.equipment li',
      '.specs li',
      '[class*="feature"]'
    ];

    for (const selector of featureSelectors) {
      $(selector).each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 200) {
          features.add(text);
        }
      });
    }

    return Array.from(features);
  }

  extractImages($, baseUrl, single = false) {
    const images = [];

    const selectors = [
      'img',
      '.gallery img',
      '.images img',
      '.vehicle-image img',
      '[class*="photo"] img',
      '[class*="image"] img'
    ];

    let foundEnough = false;
    for (const selector of selectors) {
      $(selector).each((i, el) => {
        let src = $(el).attr('src') || $(el).attr('data-src');

        if (src && !src.includes('placeholder') && !src.includes('spinner')) {
          if (!src.startsWith('http')) {
            try {
              src = new URL(src, baseUrl).href;
            } catch (e) {}
          }

          if (!images.includes(src)) {
            images.push(src);
            if (single && images.length >= 1) {
              foundEnough = true;
              return false; // Exit the each loop
            }
          }
        }
      });

      if (images.length > 0 || foundEnough) break;
    }

    return images;
  }

  calculateQualityScore(car) {
    let score = 0;
    const maxScore = 100;

    // Core data (40 points total)
    if (car.vin && car.vin.length === 17) score += 10;
    if (car.year && car.year >= 1900 && car.year <= new Date().getFullYear() + 2) score += 5;
    if (car.make) score += 5;
    if (car.model) score += 5;
    if (car.price && car.price > 0 && car.price < 1000000) score += 10;
    if (car.mileage && car.mileage >= 0) score += 5;

    // Specs (20 points total)
    if (car.transmission) score += 5;
    if (car.drivetrain) score += 5;
    if (car.body_type) score += 5;
    if (car.fuel_type) score += 5;

    // Details (20 points total)
    if (car.exterior_color) score += 5;
    if (car.interior_color) score += 5;
    if (car.engine) score += 5;
    if (car.description && car.description.length > 50) score += 5;

    // Media (10 points total)
    if (car.images && car.images.length >= 3) score += 10;
    else if (car.images && car.images.length > 0) score += 5;

    // Dealer (10 points total)
    if (car.dealer_name) score += 5;
    if (car.dealer_phone || car.dealer_address) score += 5;

    return Math.min(score, maxScore);
  }

  getQualityFlags(car) {
    const flags = [];

    if (!car.vin) flags.push({ type: 'warning', message: 'Missing VIN' });
    else if (car.vin.length !== 17) flags.push({ type: 'error', message: 'Invalid VIN length' });

    if (!car.price) flags.push({ type: 'warning', message: 'Missing price' });
    else if (car.price <= 0 || car.price > 1000000) flags.push({ type: 'warning', message: 'Unusual price' });

    if (!car.mileage && car.year && car.year < new Date().getFullYear() - 1) {
      flags.push({ type: 'warning', message: 'Older car missing mileage' });
    }

    if (!car.make || !car.model) flags.push({ type: 'error', message: 'Missing make or model' });

    if (car.year && (car.year < 1900 || car.year > new Date().getFullYear() + 2)) {
      flags.push({ type: 'warning', message: 'Unusual year' });
    }

    if (!car.images || car.images.length === 0) {
      flags.push({ type: 'info', message: 'No images' });
    }

    if (!car.description || car.description.length < 20) {
      flags.push({ type: 'info', message: 'Minimal description' });
    }

    return flags;
  }
}

module.exports = new CarScraper();
