const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let pool;

async function initializeDatabase() {
  try {
    // Connection config (without database initially)
    const connConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    };

    // 1. Create connection to run create database query
    const connection = await mysql.createConnection(connConfig);
    const dbName = process.env.DB_NAME || 'traveloop_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();

    // 2. Create the final connection pool
    pool = mysql.createPool({
      ...connConfig,
      database: dbName,
      connectionLimit: 10
    });

    console.log(`Connected to MySQL database: ${dbName}`);

    // 3. Automatically run schema.sql to create tables if they don't exist
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const conn = await pool.getConnection();
      try {
        await conn.query(schemaSql);
        console.log('Database tables verified/created successfully.');
        
        // Auto-migrate: Add start_time column to itineraries table if it doesn't exist
        try {
          await conn.query('ALTER TABLE itineraries ADD COLUMN start_time VARCHAR(50) DEFAULT NULL;');
          console.log('Database schema migrated: start_time column verified/added to itineraries.');
        } catch (alterErr) {
          // Ignore error ER_DUP_FIELDNAME (Duplicate column name)
          if (alterErr.errno !== 1060 && alterErr.code !== 'ER_DUP_FIELDNAME') {
            console.error('Failed to run schema migration for itineraries:', alterErr.message);
          }
        }

        // Auto-migrate: Add status column to users table if it doesn't exist
        try {
          await conn.query("ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';");
          console.log('Database schema migrated: status column verified/added to users.');
        } catch (alterErr) {
          if (alterErr.errno !== 1060 && alterErr.code !== 'ER_DUP_FIELDNAME') {
            console.error('Failed to run schema migration for users:', alterErr.message);
          }
        }

        // Auto-migrate: Change avatar column to LONGTEXT
        try {
          await conn.query('ALTER TABLE users MODIFY COLUMN avatar LONGTEXT;');
          console.log('Database schema migrated: avatar column changed to LONGTEXT.');
        } catch (alterErr) {
          console.error('Failed to run schema migration for avatar:', alterErr.message);
        }

        // Auto-migrate: Seed default admin user
        try {
          const [adminRows] = await conn.query("SELECT * FROM users WHERE email = 'admin@traveloop.com'");
          if (adminRows.length === 0) {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Admin@123', salt);
            await conn.query(
              "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
              ['Admin User', 'admin@traveloop.com', hashedPassword, 'admin']
            );
            console.log('Database seeded: Default admin user created (admin@traveloop.com / Admin@123)');
          }
        } catch (seedErr) {
          console.error('Failed to seed default admin user:', seedErr.message);
        }
      } catch (err) {
        console.error('Error running schema.sql initialization:', err.message);
      } finally {
        conn.release();
      }
    } else {
      console.warn('schema.sql file not found. Skipping auto-initialization.');
    }
  } catch (err) {
    console.error('Failed to connect or initialize MySQL database:', err.message);
    process.exit(1);
  }
}

// Immediately trigger database setup
initializeDatabase();

module.exports = {
  query: (sql, params) => pool.query(sql, params),
  getPool: () => pool
};
