const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let pool;

// Create a promise that resolves when the database is fully initialized
const initPromise = (async () => {
  try {
    // Connection config (without database initially)
    const connConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true,
      ssl: process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : undefined
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

    // Run schema initialization if present
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const conn = await pool.getConnection();
      try {
        await conn.query(schemaSql);
        console.log('Database tables verified/created successfully.');
        // ... (existing migration code unchanged) ...
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
})();

// Export async‑safe helpers that wait for initialization before issuing queries
module.exports = {
  query: async (sql, params) => {
    await initPromise;
    return pool.query(sql, params);
  },
  getPool: async () => {
    await initPromise;
    return pool;
  }
};
