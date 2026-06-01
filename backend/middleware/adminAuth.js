const db = require('../config/db');

module.exports = async function (req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const [users] = await db.query('SELECT role FROM users WHERE id = ?', [req.user.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (users[0].role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    next();
  } catch (err) {
    console.error('Admin Auth Middleware Error:', err);
    res.status(500).json({ message: 'Server error authorizing admin' });
  }
};
