const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Request Logger
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Enable parsing JSON and URLencoded bodies with larger limit for avatar uploads (base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Import Routes
const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trips');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

// Base Route
app.get('/', (req, res) => {
  res.send('Traveloop MySQL Backend API running successfully.');
});

// Global Error Handler
const db = require('./config/db');
app.use(async (err, req, res, next) => {
  console.error('[Global Error]', err);
  
  try {
    const endpoint = `${req.method} ${req.url}`;
    const message = err.message || 'Unknown Error';
    const stack = err.stack || '';
    
    await db.query(
      'INSERT INTO error_logs (endpoint, message, stack_trace) VALUES (?, ?, ?)',
      [endpoint, message, stack]
    );
  } catch (dbErr) {
    console.error('Failed to log error to DB:', dbErr);
  }

  res.status(500).json({ message: 'An internal server error occurred.' });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
