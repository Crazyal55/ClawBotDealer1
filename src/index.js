const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { Pool } = require('pg');

// Simple inventory repository (in-memory for testing)
const vehicles = [
  {
    id: 1,
    vin: '1HGCM82633A004352',
    year: 2023,
    make: 'Toyota',
    model: 'Camry',
    trim: 'SE',
    price: 28450,
    mileage: 15234,
    stockNumber: 'T12345',
    bodyType: 'Sedan',
    transmission: 'Automatic',
    drivetrain: 'FWD',
    fuelType: 'Gasoline',
    exteriorColor: 'Celestial Silver Metallic',
    interiorColor: 'Black',
    features: ['Backup Camera', 'Blind Spot Monitor', 'Apple CarPlay', 'Android Auto'],
    images: ['https://images.unsplash.com/photo-1494976388531-58e0a3a8294'],
    description: 'Clean 1-owner vehicle in excellent condition. All maintenance records available. Non-smoker, no pets.',
    dealerName: 'Test Dealership',
    dealerAddress: '123 Main St, City, ST 12345',
    dealerPhone: '(555) 123-4567',
    source: 'Test',
    url: 'https://example.com/vehicle/12345',
    qualityScore: 87,
    qualityFlags: [],
    scrapedAt: new Date(),
    dealershipId: 'test'
  },
  {
    id: 2,
    vin: '2HGCM82633A004353',
    year: 2022,
    make: 'Honda',
    model: 'CR-V',
    trim: 'EX',
    price: 31200,
    mileage: 28567,
    stockNumber: 'H67890',
    bodyType: 'SUV',
    transmission: 'CVT',
    drivetrain: 'AWD',
    fuelType: 'Gasoline',
    exteriorColor: 'Sonic Gray Pearl',
    interiorColor: 'Gray',
    features: ['Honda Sensing', 'Lane Assist', 'Bluetooth HandsFreeLink'],
    images: ['https://images.unsplash.com/photo-1533473169059-c3738b6471f4'],
    description: 'Well-maintained SUV with low mileage. One owner, clean title.',
    dealerName: 'Test Dealership',
    dealerAddress: '456 Oak Ave, Town, ST 54321',
    dealerPhone: '(555) 987-6543',
    source: 'Test',
    url: 'https://example.com/vehicle/67890',
    qualityScore: 92,
    qualityFlags: [],
    scrapedAt: new Date(),
    dealershipId: 'test'
  }
];

// PostgreSQL pool (will try to connect, fallback to memory if fails)
let pool;
try {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'dealership_platform',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  console.log('✅ PostgreSQL pool created');
} catch (error) {
  console.warn('⚠️  PostgreSQL connection failed, using in-memory database');
  console.error(error);
}

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }, 'API Request');
  });

  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: pool ? 'connected (PostgreSQL)' : 'in-memory',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes

// Get all vehicles with filters
app.get('/api/inventory', async (req, res) => {
  try {
    const { make, model, minYear, maxYear, minPrice, maxPrice, source, limit = 50 } = req.query;
    
    let filtered = [...vehicles];
    
    // Apply filters
    if (make) {
      filtered = filtered.filter(v => v.make.toLowerCase() === make.toLowerCase());
    }
    
    if (model) {
      filtered = filtered.filter(v => v.model.toLowerCase().includes(model.toLowerCase()));
    }
    
    if (minYear) {
      filtered = filtered.filter(v => v.year >= parseInt(minYear));
    }
    
    if (maxYear) {
      filtered = filtered.filter(v => v.year <= parseInt(maxYear));
    }
    
    if (minPrice) {
      filtered = filtered.filter(v => v.price >= parseFloat(minPrice));
    }
    
    if (maxPrice) {
      filtered = filtered.filter(v => v.price <= parseFloat(maxPrice));
    }
    
    if (source) {
      filtered = filtered.filter(v => v.source === source);
    }
    
    // Apply pagination
    const offset = 0;
    filtered = filtered.slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      data: filtered,
      total: vehicles.length,
      filters: { make, model, minYear, maxYear, minPrice, maxPrice, source }
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Get single vehicle
app.get('/api/inventory/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const vehicle = vehicles.find(v => v.id === id);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
        code: 'NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Get stats
app.get('/api/inventory/stats', (req, res) => {
  try {
    const total = vehicles.length;
    const carsWithPrice = vehicles.filter(v => v.price);
    const avgPrice = carsWithPrice.length > 0 
      ? carsWithPrice.reduce((sum, v) => sum + v.price, 0) / carsWithPrice.length 
      : 0;
    
    const carsWithMileage = vehicles.filter(v => v.mileage);
    const avgMileage = carsWithMileage.length > 0
      ? carsWithMileage.reduce((sum, v) => sum + v.mileage, 0) / carsWithMileage.length
      : 0;
    
    const makeCounts = vehicles.reduce((acc, v) => {
      acc[v.make] = (acc[v.make] || 0) + 1;
      return acc;
    }, {});
    
    const makeDistribution = Object.entries(makeCounts)
      .map(([make, count]) => ({ make, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const highQuality = vehicles.filter(v => (v.qualityScore || 0) >= 80).length;
    const issues = vehicles.filter(v => v.qualityFlags && v.qualityFlags.length > 0).length;
    
    res.json({
      success: true,
      data: {
        total,
        avgPrice,
        avgMileage,
        makeDistribution,
        highQuality,
        issues,
        avgQuality: Math.round(vehicles.reduce((sum, v) => sum + (v.qualityScore || 0), 0) / vehicles.length)
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[API Error]', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    code: 'NOT_FOUND',
    path: req.path
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing HTTP server...');
  
  if (pool) {
    pool.end(() => {
      console.log('PostgreSQL pool closed');
      process.exit(0);
    });
  } else {
    console.log('No database connection to close');
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  
  if (pool) {
    pool.end(() => {
      console.log('PostgreSQL pool closed');
      process.exit(0);
    });
  } else {
    console.log('No database connection to close');
    process.exit(0);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 AI Dealership Platform API');
  console.log('📡 Environment: development');
  console.log(`🔌 Port: ${PORT}`);
  console.log('🗄️  Database: in-memory (sample data)');
  console.log('✅ Ready to accept connections');
  console.log('');
  console.log('Dashboard: http://localhost:3000/public/index.html');
  console.log('Health Check: http://localhost:3000/health');
  console.log('');
});

module.exports = app;
