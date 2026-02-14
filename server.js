const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('./db');
const scraper = require('./scraper');
const CarInventoryCrawler = require('./crawler');

const app = express();
const PORT = Number(process.env.PORT || 3000);

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production';

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (!isProduction && allowedOrigins.length === 0) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
  }
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));
app.use('/api', apiLimiter);
app.use((err, req, res, next) => {
  if (err && err.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ success: false, message: err.message });
  }
  return next(err);
});

const db = new Database();

// Crawl job management
const crawlJobs = new Map();

// Helper to generate job ID
function generateJobId() {
  return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Initialize database
db.init().then(() => {
  console.log('Database initialized');
}).catch(err => {
  console.error('Database initialization error:', err);
});

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

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
      source: result.source,
      url: result.url,
      cars: result.cars,
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
    const deletedCount = await new Promise((resolve, reject) => {
      db.db.run(`
        DELETE FROM inventory
        WHERE id IN (
          SELECT id FROM (
            SELECT
              id,
              ROW_NUMBER() OVER (
                PARTITION BY vin
                ORDER BY datetime(scraped_at) DESC, id DESC
              ) AS row_num
            FROM inventory
            WHERE vin IS NOT NULL AND TRIM(vin) <> ''
          ) ranked
          WHERE row_num > 1
        )
      `, function(err) {
        if (err) reject(err);
        else resolve(this.changes || 0);
      });
    });

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

// ============================================================================
// CRAWLER ENDPOINTS
// ============================================================================

// Start a new crawl job
app.post('/api/crawl', async (req, res) => {
  const { url, sourceName, options = {} } = req.body;

  // Validate URL
  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL is required'
    });
  }

  try {
    // Create job
    const jobId = generateJobId();
    const job = {
      id: jobId,
      url,
      sourceName: sourceName || 'crawler',
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      vehicles: [],
      stats: null,
      options
    };

    crawlJobs.set(jobId, job);

    // Start crawling asynchronously
    const crawler = new CarInventoryCrawler({
      maxPages: options.maxPages || 50,
      maxVehicles: options.maxVehicles || 500,
      concurrency: options.concurrency || 3,
      rateLimit: options.rateLimit || 1500,
      maxRetries: 3,
      onProgress: (progress) => {
        job.progress = progress;
      }
    });

    // Run crawl in background
    crawler.crawl(url, sourceName || 'crawler').then(result => {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.vehicles = result.vehicles;
      job.stats = result.stats;

      // Save to database
      db.saveInventory({ source: sourceName || 'crawler', cars: result.vehicles })
        .then(saved => {
          console.log(`[Crawler] Saved ${saved.length} vehicles to database`);
        })
        .catch(err => {
          console.error('[Crawler] Error saving to database:', err);
        });
    }).catch(error => {
      job.status = 'failed';
      job.completedAt = new Date().toISOString();
      job.error = error.message;
      console.error('[Crawler] Job failed:', error);
    });

    res.json({
      success: true,
      jobId,
      status: 'started',
      message: 'Crawling job started',
      url
    });

  } catch (error) {
    console.error('Crawl start error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get crawl job status
app.get('/api/crawl/:jobId/status', (req, res) => {
  const job = crawlJobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found'
    });
  }

  res.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress || {
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0
    },
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    url: job.url
  });
});

// Get crawl job results
app.get('/api/crawl/:jobId/results', (req, res) => {
  const job = crawlJobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found'
    });
  }

  if (job.status !== 'completed') {
    return res.status(400).json({
      success: false,
      error: 'Job not complete yet',
      status: job.status
    });
  }

  res.json({
    success: true,
    jobId: job.id,
    vehicles: job.vehicles,
    stats: job.stats,
    completedAt: job.completedAt
  });
});

app.listen(PORT, () => {
  console.log(`🚗 Dealer Dev Ops running at http://localhost:${PORT}`);
});
