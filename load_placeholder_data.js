#!/usr/bin/env node

/**
 * Placeholder Data Inserter
 * Loads 59 fake vehicles into the database for testing
 */

const fs = require('fs');
const path = require('path');
const Database = require('./db');

const db = new Database();

async function loadPlaceholderData() {
  console.log('📋 Loading placeholder data into database...');

  // Check if placeholder SQL file exists
  const sqlFile = path.join(__dirname, 'placeholder_data.sql');
  
  if (!fs.existsSync(sqlFile)) {
    console.error('❌ placeholder_data.sql not found');
    console.error('   Run: node generate_placeholder_data.js first');
    process.exit(1);
  }

  // Read the SQL file
  const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
  
  console.log('   📄 SQL file found');
  
  // For SQLite, we need to convert PostgreSQL syntax to SQLite
  // Main differences:
  // - BIGSERIAL -> INTEGER PRIMARY KEY AUTOINCREMENT
  // - CURRENT_TIMESTAMP -> datetime('now')
  // - JSONB -> TEXT (SQLite doesn't have JSONB)
  // - Boolean -> INTEGER (0 or 1)
  
  const sqliteSQL = sqlContent
    .replace(/BIGSERIAL/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/SERIAL/g, 'INTEGER')
    .replace(/BIGINT/g, 'INTEGER')
    .replace(/DECIMAL\(/g, 'REAL(')
    .replace(/VARCHAR\(/g, 'TEXT(')
    .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
    .replace(/TIMESTAMP/g, 'DATETIME')
    .replace(/BOOLEAN DEFAULT true/g, 'INTEGER DEFAULT 1')
    .replace(/BOOLEAN/g, 'INTEGER')
    .replace(/TEXT DEFAULT CURRENT_TIMESTAMP/g, 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  // Execute the SQL
  try {
    db.db.exec(sqliteSQL);
    console.log('   ✅ SQL executed successfully');
    
    // Verify data
    const count = db.db.prepare('SELECT COUNT(*) as count FROM vehicles').get();
    console.log(`   📊 Vehicles loaded: ${count.count}`);
    
    if (count.count > 0) {
      console.log('   🎉 Placeholder data loaded successfully!');
      console.log('');
      console.log('   Dashboard: http://localhost:3000');
      console.log('   To clear: DELETE /api/inventory');
    } else {
      console.log('   ⚠️  No vehicles loaded');
    }
    
  } catch (error) {
    console.error('   ❌ Error executing SQL:', error.message);
    process.exit(1);
  }
}

// Run
loadPlaceholderData().catch(error => {
  console.error('💥 Failed:', error);
  process.exit(1);
});
