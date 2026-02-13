#!/usr/bin/env node

/**
 * Mock Data Generator - Generates 59 fake vehicles directly
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Database = require('./db');

// Helper for random
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Fake dealership data
const dealership = {
  name: 'Summit Automotive Group',
  business_id: 'summit-auto',
  locations: [
    { id: 1, name: 'Summit Automotive - Denver', address: '1234 Speer Blvd', city: 'Denver', state: 'CO', zip: '80204', phone: '(303) 555-0101' },
    { id: 2, name: 'Summit Automotive - Aurora', address: '5678 S Peoria St', city: 'Aurora', state: 'CO', zip: '80012', phone: '(303) 555-0202' },
    { id: 3, name: 'Summit Automotive - Lakewood', address: '9101 W Colfax Ave', city: 'Lakewood', state: 'CO', zip: '80215', phone: '(303) 555-0303' }
  ]
};

// Generate 59 fake vehicles
function generateVehicles() {
  const makes = ['Ford', 'Toyota', 'Jeep', 'Subaru', 'Tesla', 'Honda', 'Chevrolet', 'Kia', 'Mazda', 'Nissan', 'Buick'];
  const bodyTypes = ['Sedan', 'SUV', 'Pickup Truck', 'Wagon', 'Coupe'];
  const transmissions = ['Automatic', 'Manual', 'CVT'];
  const drivetrains = ['FWD', 'AWD', '4WD', 'RWD'];
  const colors = ['White', 'Silver', 'Gray', 'Black', 'Red', 'Blue'];

  const vehicles = [];

  // Generate vehicles
  for (let i = 0; i < 59; i++) {
    const location = dealership.locations[Math.floor(Math.random() * dealership.locations.length)];
    const vehicleMake = rand(makes);
    const vehicleBodyType = rand(bodyTypes);
    
    vehicles.push({
      source: 'placeholder',
      vin: generateFakeVIN(),
      year: randInt(2014, 2024),
      make: vehicleMake,
      model: generateFakeModel(vehicleMake),
      trim: generateFakeTrim(),
      price: randInt(15000, 70000),
      mileage: randInt(5000, 100000),
      exterior_color: rand(colors),
      interior_color: rand(colors),
      body_type: vehicleBodyType,
      transmission: rand(transmissions),
      drivetrain: rand(drivetrains),
      fuel_type: 'Gasoline',
      engine: generateFakeEngine(),
      mpg_city: randInt(15, 35),
      mpg_highway: randInt(20, 45),
      description: generateFakeDescription(vehicleMake, vehicleBodyType),
      features: generateFakeFeatures(),
      images: [`https://example.com/car${i}_1.jpg`, `https://example.com/car${i}_2.jpg`],
      dealer_name: dealership.name,
      dealer_address: location.address,
      dealer_phone: location.phone,
      location_id: location.id
    });
  }

  return vehicles;
}

function generateFakeVIN() {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars[Math.floor(Math.random() * chars.length)];
  }
  return vin;
}

function generateFakeModel(make) {
  const models = {
    'Ford': ['F-150', 'Fusion', 'Explorer', 'Expedition', 'Mustang', 'Bronco', 'Edge'],
    'Toyota': ['Camry', 'RAV4', 'Highlander', '4Runner', 'Tundra', 'Tacoma', 'Corolla'],
    'Jeep': ['Grand Cherokee', 'Wrangler', 'Cherokee', 'Gladiator', 'Renegade'],
    'Subaru': ['Outback', 'Forester', 'Impreza', 'Legacy', 'Ascent'],
    'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X'],
    'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Passport'],
    'Chevrolet': ['Silverado', 'Equinox', 'Traverse', 'Corvette', 'Tahoe', 'Suburban'],
    'Kia': ['Sorento', 'Sportage', 'Telluride', 'Soul'],
    'Mazda': ['Mazda3', 'CX-5', 'CX-9', 'MX-5'],
    'Nissan': ['Frontier', 'Pathfinder', 'Altima', 'Rogue', 'Titan'],
    'Buick': ['Enclave', 'LaCrosse', 'Encore', 'Envision']
  };
  const makeModels = models[make] || ['Base', 'SE', 'LE'];
  return makeModels[Math.floor(Math.random() * makeModels.length)];
}

function generateFakeTrim() {
  const trims = ['Base', 'SE', 'LE', 'XLE', 'Limited', 'Touring', 'GT', 'Titanium', 'Platinum', 'Premium', 'SEL', 'Lariat', 'King Ranch'];
  return trims[Math.floor(Math.random() * trims.length)];
}

function generateFakeEngine() {
  const engines = [
    '2.0L I4', '2.5L I4', '3.5L V6', '5.0L V8', '3.6L V6', 
    '2.4L I4 Turbo', 'Electric Motor', '3.3L V6', '4.0L V8', '2.0L Hybrid'
  ];
  return engines[Math.floor(Math.random() * engines.length)];
}

function generateFakeDescription(make, bodyType) {
  const adjectives = ['Well-maintained', 'One owner', 'Clean CarFax', 'Like new', 'Low mileage', 'Excellent condition'];
  const phrases = [
    `This ${bodyType.toLowerCase()} has been ${rand(adjectives)}.`,
    `Great condition ${rand(adjectives)}.`,
    `${make} reliability at its best.`
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function generateFakeFeatures() {
  const featureLists = [
    ['Backup Camera', 'Bluetooth', 'Cruise Control', 'Heated Seats', 'Navigation'],
    ['Sunroof', 'Leather Interior', 'Apple CarPlay', 'Android Auto'],
    ['Power Liftgate', 'Remote Start', 'Keyless Entry', 'Push Button Start'],
    ['Alloy Wheels', 'Privacy Glass', 'Tow Package', 'All-Season Tires'],
    ['Bose Audio', 'JBL Sound System', 'Harman Kardon', 'Bang & Olufsen']
  ];
  return rand(featureLists);
}

async function saveToDatabase() {
  const db = new Database();
  
  // Initialize database
  await db.init();
  
  console.log('📋 Generating 59 fake vehicles...');
  const vehicles = generateVehicles();
  console.log('   ✅ Generated');

  console.log('📦 Saving to database...');
  
  let savedCount = 0;
  
  for (const vehicle of vehicles) {
    try {
      const stmt = db.db.prepare(`
        INSERT INTO vehicles (
          source, vin, year, make, model, trim, price, mileage,
          exterior_color, interior_color, body_type, transmission,
          drivetrain, fuel_type, engine, mpg_city, mpg_highway,
          description, features, images, dealer_name, dealer_address,
          dealer_phone, quality_score, availability
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        vehicle.source,
        vehicle.vin,
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.trim,
        vehicle.price,
        vehicle.mileage,
        vehicle.exterior_color,
        vehicle.interior_color,
        vehicle.body_type,
        vehicle.transmission,
        vehicle.drivetrain,
        vehicle.fuel_type,
        vehicle.engine,
        vehicle.mpg_city,
        vehicle.mpg_highway,
        vehicle.description,
        JSON.stringify(vehicle.features),
        JSON.stringify(vehicle.images),
        vehicle.dealer_name,
        vehicle.dealer_address,
        vehicle.dealer_phone,
        Math.floor(Math.random() * 30) + 70, // Quality 70-100
        1
      );

      savedCount++;

      if (savedCount % 10 === 0) {
        console.log(`   Progress: ${savedCount}/59`);
      }
    } catch (error) {
      console.error(`   ❌ Error saving vehicle ${savedCount + 1}:`, error.message);
    }
  }

  console.log('   ✅ All vehicles saved');

  // Verify
  const count = db.db.prepare('SELECT COUNT(*) as count FROM vehicles').get();
  console.log(`   📊 Total vehicles in database: ${count.count}`);

  if (count.count === 59) {
    console.log('   🎉 All 59 vehicles loaded successfully!');
  } else {
    console.log(`   ⚠️  Expected 59, got ${count.count}`);
  }
}

// Run
saveToDatabase().catch(error => {
  console.error('💥 Failed:', error);
  process.exit(1);
});
