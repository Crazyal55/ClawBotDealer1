const express = require('express');
const cors = require('cors');
const Database = require('./db');
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

// Routes
app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await db.getAllInventory();
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
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
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    // Process in parallel batches of 5
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
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    const deleted = await db.deleteInventory(req.params.id);
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

// New endpoints
app.get('/api/stats', async (req, res) => {
  try {
    const [qualityStats, sources] = await Promise.all([
      db.getDataQualityStats(),
      db.getSources()
    ]);

    res.json({
      success: true,
      quality: qualityStats,
      sources: sources
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/stats/duplicates', async (req, res) => {
  try {
    const duplicates = await new Promise((resolve, reject) => {
      db.db.all(`
        SELECT vin, COUNT(*) as count, GROUP_CONCAT(id) as ids
        FROM inventory
        WHERE vin IS NOT NULL
        GROUP BY vin
        HAVING count > 1
        ORDER BY count DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      success: true,
      duplicates: duplicates.map(d => ({
        vin: d.vin,
        count: d.count,
        ids: d.ids.split(',').map(Number)
      }))
    });
  } catch (error) {
    console.error('Duplicates error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/inventory/vin/:vin', async (req, res) => {
  try {
    const matches = await db.findByVin(req.params.vin);
    res.json({
      success: true,
      matches: matches.length,
      data: matches
    });
  } catch (error) {
    console.error('VIN search error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/inventory/duplicates', async (req, res) => {
  try {
    // Find all duplicates and keep only the newest one
    const duplicates = await new Promise((resolve, reject) => {
      db.db.all(`
        SELECT vin, MAX(scraped_at) as keep_date, GROUP_CONCAT(id) as all_ids
        FROM inventory
        WHERE vin IS NOT NULL
        GROUP BY vin
        HAVING COUNT(*) > 1
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    let deletedCount = 0;
    for (const dup of duplicates) {
      const allIds = dup.all_ids.split(',').map(Number);
      const keepId = await new Promise((resolve, reject) => {
        db.db.get(
          `SELECT id FROM inventory WHERE vin = ? ORDER BY scraped_at DESC LIMIT 1`,
          [dup.vin],
          (err, row) => {
            if (err) reject(err);
            else resolve(row.id);
          }
        );
      });

      const toDelete = allIds.filter(id => id !== keepId);
      for (const id of toDelete) {
        await db.deleteInventory(id);
        deletedCount++;
      }
    }

    res.json({
      success: true,
      message: `Deleted ${deletedCount} duplicate records`,
      deletedCount
    });
  } catch (error) {
    console.error('Delete duplicates error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚗 Car Scraper Dashboard running at http://localhost:${PORT}`);
});
