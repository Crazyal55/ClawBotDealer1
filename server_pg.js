const express = require('express');
const cors = require('cors');
const DatabasePG = require('./db_pg');
const scraper = require('./scraper');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = new DatabasePG();

// Initialize database
db.init().then(() => {
  console.log('✅ Database initialized');
}).catch(err => {
  console.error('❌ Database initialization error:', err.message);
  console.error('Run: psql -d summit_auto < placeholder_data.sql');
});

// === INVENTORY ROUTES ===

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

// === DEALER & LOCATION ROUTES ===

app.get('/api/dealers', async (req, res) => {
  try {
    const dealers = await db.getAllDealers();
    res.json(dealers);
  } catch (error) {
    console.error('Error fetching dealers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/dealers/:dealerId/locations', async (req, res) => {
  try {
    const locations = await db.getDealerLocations(parseInt(req.params.dealerId));
    res.json(locations);
  } catch (error) {
    console.error('Error fetching dealer locations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
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
    console.error('Error searching VIN:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/stats/duplicates', async (req, res) => {
  try {
    // Find duplicate VINs
    const result = await db.pool.query(`
      SELECT vin, COUNT(*) as count, ARRAY_AGG(id) as ids
      FROM vehicles
      WHERE vin IS NOT NULL
      GROUP BY vin
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      duplicates: result.rows.map(d => ({
        vin: d.vin,
        count: parseInt(d.count),
        ids: d.ids
      }))
    });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/inventory/duplicates', async (req, res) => {
  try {
    const result = await db.pool.query(`
      SELECT vin, MAX(id) as keep_id, ARRAY_AGG(id) as all_ids
      FROM vehicles
      WHERE vin IS NOT NULL
      GROUP BY vin
      HAVING COUNT(*) > 1
    `);

    let deletedCount = 0;

    for (const dup of result.rows) {
      const allIds = dup.all_ids;
      const keepId = dup.keep_id;
      const toDelete = allIds.filter(id => id !== keepId);

      for (const id of toDelete) {
        await db.pool.query('DELETE FROM vehicles WHERE id = $1', [id]);
        deletedCount++;
      }
    }

    res.json({
      success: true,
      message: `Deleted ${deletedCount} duplicate records`,
      deletedCount
    });
  } catch (error) {
    console.error('Error deleting duplicates:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚗 Car Scraper Dashboard running at http://localhost:${PORT}`);
  console.log(`📊 Database: PostgreSQL`);
  console.log(`📍 Dealers: Summit Automotive Group (3 locations)`);
  console.log(`🚗 Vehicles: 59 (placeholder data)`);
  console.log(`\n✅ Ready for development`);
});
