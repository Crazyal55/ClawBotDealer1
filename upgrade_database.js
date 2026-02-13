const Database = require('./db_v2');

async function upgradeDatabase() {
  const db = new Database();
  
  console.log('🔄 Upgrading database schema...');
  
  // Check if column exists
  const tableInfo = await new Promise((resolve, reject) => {
    db.db.all("PRAGMA table_info(inventory)", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  
  const hasQualityScore = tableInfo.some(col => col.name === '_qualityScore');
  const hasLocationId = tableInfo.some(col => col.name === 'location_id');
  const hasAvailability = tableInfo.some(col => col.name === 'availability');
  
  console.log('   Existing columns:', tableInfo.map(c => c.name).join(', '));
  
  if (!hasQualityScore) {
    console.log('   Adding _qualityScore column...');
    await new Promise((resolve, reject) => {
      db.db.run("ALTER TABLE inventory ADD COLUMN _qualityScore INTEGER DEFAULT 0", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('   ✅ _qualityScore added');
  }
  
  if (!hasLocationId) {
    console.log('   Adding location_id column...');
    await new Promise((resolve, reject) => {
      db.db.run("ALTER TABLE inventory ADD COLUMN location_id INTEGER", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('   ✅ location_id added');
  }
  
  if (!hasAvailability) {
    console.log('   Adding availability column...');
    await new Promise((resolve, reject) => {
      db.db.run("ALTER TABLE inventory ADD COLUMN availability INTEGER DEFAULT 1", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('   ✅ availability added');
  }
  
  console.log('   ✅ Database upgraded successfully');
  db.close();
}

upgradeDatabase().catch(err => {
  console.error('❌ Upgrade failed:', err);
  process.exit(1);
});
