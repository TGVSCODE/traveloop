const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

module.exports = async function (req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Check if Bearer prefix exists
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Token format is invalid, must be Bearer <token>' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'traveloop_super_secret_key_123!');
    
    // Check if user still exists in database
    const [users] = await db.query('SELECT id FROM users WHERE id = ?', [decoded.user.id]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'User no longer exists. Please login again.' });
    }

    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
