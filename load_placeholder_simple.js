#!/usr/bin/env node

/**
 * Simple data loader - Generate 59 vehicles for testing
 */

const Database = require('./db');

async function loadData() {
  console.log('📋 Loading 59 placeholder vehicles...');
  
  const db = new Database();
  await db.init();

  // Generate and save vehicles
  for (let i = 0; i < 59; i++) {
    const vin = generateFakeVIN();
    const location = i < 22 ? 1 : (i < 40 ? 2 : 3); // Denver: 22, Aurora: 18, Lakewood: 19
    
    const car = {
      source: 'placeholder',
      vin: vin,
      year: Math.floor(Math.random() * (2024 - 2015)) + 2015,
      make: ['Ford', 'Toyota', 'Jeep', 'Subaru', 'Tesla', 'Honda', 'Chevrolet'][Math.floor(Math.random() * 7)],
      model: 'Test Model',
      trim: ['Base', 'SE', 'LE', 'Limited', 'XLE', 'Titanium'][Math.floor(Math.random() * 6)],
      price: Math.floor(Math.random() * 55000) + 15000,
      mileage: Math.floor(Math.random() * 95000) + 5000,
      exterior_color: ['White', 'Silver', 'Gray', 'Black'][Math.floor(Math.random() * 4)],
      interior_color: ['Black', 'Gray', 'Beige'][Math.floor(Math.random() * 3)],
      body_type: ['Sedan', 'SUV', 'Pickup Truck', 'Wagon'][Math.floor(Math.random() * 4)],
      transmission: ['Automatic', 'CVT'][Math.floor(Math.random() * 2)],
      drivetrain: ['FWD', 'AWD', '4WD', 'RWD'][Math.floor(Math.random() * 4)],
      fuel_type: 'Gasoline',
      engine: '2.5L I4',
      mpg_city: Math.floor(Math.random() * 20) + 15,
      mpg_highway: Math.floor(Math.random() * 25) + 20,
      description: `Test vehicle #${i + 1} - Placeholder description for testing.`,
      features: ['Test Feature'],
      images: [`https://example.com/car${i}.jpg`],
      dealer_name: 'Summit Automotive Group',
      dealer_address: location === 1 ? '1234 Speer Blvd, Denver CO' : (location === 2 ? '5678 S Peoria St, Aurora CO' : '9101 W Colfax Ave, Lakewood CO'),
      dealer_phone: '(303) 555-0101',
      location_id: location,
      _qualityScore: Math.floor(Math.random() * 30) + 70,
      availability: true
    };

    await db.saveInventory({ source: 'placeholder', cars: [car] });
    
    if ((i + 1) % 10 === 0) {
      console.log(`   Progress: ${i + 1}/59`);
    }
  }

  console.log('   ✅ All 59 vehicles saved!');
}

function generateFakeVIN() {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars[Math.floor(Math.random() * chars.length)];
  }
  return vin;
}

loadData().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
