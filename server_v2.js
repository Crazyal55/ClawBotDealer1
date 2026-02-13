const express = require('express');
const cors = require('cors');
const Database = require('./db_v2');
const scraper = require('./scraper');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = new Database();

// Initialize database
db.init().then(() => {
  console.log('Database initialized');
}).catch(err => {
  console.error('Database initialization error:', err);
});

// ==================== INVENTORY ROUTES ====================

app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await db.getAllInventory();
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/inventory/location/:locationId', async (req, res) => {
  try {
    const inventory = await db.getInventoryByLocation(parseInt(req.params.locationId));
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory by location:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/scrape', async (req, res) => {
  const { curlCommand, sourceName } = req.body;

  try {
    const result = await scraper.fromCurl(curlCommand, sourceName);
    const saved = await db.saveInventory(result);

    res.json({
      success: true,
      message: `Scraped ${result.cars.length} cars`,
      data: saved
    });
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.post('/api/scrape/batch', async (req, res) => {
  const { curlCommands, sourceName } = req.body;

  if (!Array.isArray(curlCommands) || curlCommands.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'curlCommands must be a non-empty array'
    });
  }

  const results = [];
  let totalCars = 0;
  let failed = 0;

  try {
    const batchSize = 5;
    for (let i = 0; i < curlCommands.length; i += batchSize) {
      const batch = curlCommands.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(cmd => scraper.fromCurl(cmd, sourceName))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const saved = await db.saveInventory(result.value);
          totalCars += result.value.cars.length;
          results.push({
            success: true,
            cars: result.value.cars.length,
            url: result.value.url
          });
        } else {
          failed++;
          results.push({
            success: false,
            error: result.reason.message
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Scraped ${totalCars} cars from ${curlCommands.length - failed} sources (${failed} failed)`,
      totalCars,
      totalSources: curlCommands.length,
      failed,
      results
    });
  } catch (error) {
    console.error('Batch scraping error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.post('/api/test', async (req, res) => {
  const { curlCommand, sourceName } = req.body;

  try {
    const result = await scraper.fromCurl(curlCommand, sourceName);

    res.json({
      success: true,
      message: 'Test scrape successful',
      data: result.cars,
      url: result.url,
      source: result.source
    });
  } catch (error) {
    console.error('Test scrape error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    const deleted = await db.deleteInventory(parseInt(req.params.id));
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: 'Not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/inventory', async (req, res) => {
  try {
    const count = await db.clearInventory();
    res.json({ success: true, message: `Cleared ${count} records` });
  } catch (error) {
    console.error('Clear error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== FILTER ROUTES ====================

app.get('/api/inventory/filter', async (req, res) => {
  try {
    const filters = {
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : null,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : null,
      minYear: req.query.minYear ? parseInt(req.query.minYear) : null,
      maxYear: req.query.maxYear ? parseInt(req.query.maxYear) : null,
      minQuality: req.query.minQuality ? parseInt(req.query.minQuality) : null,
      make: req.query.make || null,
      model: req.query.model || null,
      locationId: req.query.locationId ? parseInt(req.query.locationId) : null
    };

    const inventory = await db.getFilteredInventory(filters);
    res.json(inventory);
  } catch (error) {
    console.error('Filter error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ANALYTICS ROUTES ====================

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/stats/quality', async (req, res) => {
  try {
    const inventory = await db.getAllInventory();
    
    const qualityDistribution = {
      high: inventory.filter(c => (c._qualityScore || 0) >= 80).length,
      medium: inventory.filter(c => {
        const score = c._qualityScore || 0;
        return score >= 50 && score < 80;
      }).length,
      low: inventory.filter(c => (c._qualityScore || 0) < 50).length,
      none: inventory.filter(c => !c._qualityScore).length
    };

    res.json({
      success: true,
      distribution: qualityDistribution,
      total: inventory.length
    });
  } catch (error) {
    console.error('Quality stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/stats/price', async (req, res) => {
  try {
    const inventory = await db.getAllInventory();
    const prices = inventory.filter(c => c.price).map(c => c.price);
    
    const stats = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      median: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Price stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'SQLite',
    vehicles: db.getVehicleCount ? db.getVehicleCount() : 'unknown'
  });
});

// ==================== 404 HANDLER ====================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚗 Car Scraper Dashboard running at http://localhost:${PORT}`);
  console.log(`📊 Database: SQLite`);
  console.log(`🚗 Vehicles: 59 (placeholder)`);
  console.log(`✅ API Ready`);
});
