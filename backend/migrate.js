const db = require('./config/db');

async function migrate() {
  try {
    await new Promise(resolve => setTimeout(resolve, 500)); // wait for db pool
    
    // Add status column to users if not exists
    try {
      await db.query('ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT "active";');
      console.log('Added status column to users table.');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }

    // Create announcements table
    await db.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created announcements table.');

    // Create error_logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        endpoint VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        stack_trace TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created error_logs table.');

    console.log('Migration successful.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
