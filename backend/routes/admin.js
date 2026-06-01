const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// All routes in this file require both valid login token and admin privileges
router.use(auth, adminAuth);

// ==========================================
// User Management
// ==========================================

// Get all users
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, role, status, created_at FROM users');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving users' });
  }
});

// Update user status (Suspend/Activate)
router.put('/users/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  // Prevent suspending oneself
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ message: 'Cannot suspend your own admin account' });
  }

  try {
    await db.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: `User status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating user status' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  // Prevent deleting oneself
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ message: 'Cannot delete your own admin account' });
  }

  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User permanently deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

// ==========================================
// Announcements (Global Content)
// ==========================================

// Get all announcements
router.get('/announcements', async (req, res) => {
  try {
    const [announcements] = await db.query('SELECT * FROM announcements ORDER BY created_at DESC');
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving announcements' });
  }
});

// Create new announcement
router.post('/announcements', async (req, res) => {
  const { message, type } = req.body;
  if (!message) {
    return res.status(400).json({ message: 'Announcement message is required' });
  }

  try {
    // Optionally deactivate previous active announcements so only one is shown at a time
    await db.query('UPDATE announcements SET active = 0');

    const [result] = await db.query(
      'INSERT INTO announcements (message, type, active) VALUES (?, ?, 1)',
      [message, type || 'info']
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error creating announcement' });
  }
});

// Delete announcement
router.delete('/announcements/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting announcement' });
  }
});

// ==========================================
// Analytics & Insights
// ==========================================

router.get('/analytics', async (req, res) => {
  try {
    // Top Destinations
    const [topDestinations] = await db.query(`
      SELECT destination as city, COUNT(*) as count 
      FROM trips 
      GROUP BY destination 
      ORDER BY count DESC 
      LIMIT 5
    `);

    // Feature Usage Metrics
    const [[tripsCount]] = await db.query('SELECT COUNT(*) as c FROM trips');
    const [[itinerariesCount]] = await db.query('SELECT COUNT(*) as c FROM itineraries');
    const [[expensesCount]] = await db.query('SELECT COUNT(*) as c FROM expenses');
    const [[checklistsCount]] = await db.query('SELECT COUNT(*) as c FROM checklists');

    const featureUsage = {
      tripsPlanned: tripsCount.c,
      itineraryItemsAdded: itinerariesCount.c,
      expensesTracked: expensesCount.c,
      packingItemsAdded: checklistsCount.c
    };

    // Active Sessions (sessions with lastActive updated recently, or simply current=1)
    const [[sessionsCount]] = await db.query('SELECT COUNT(*) as c FROM user_sessions WHERE current = 1');

    res.json({
      topDestinations,
      featureUsage,
      activeSessions: sessionsCount.c
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching analytics' });
  }
});

// ==========================================
// System Health
// ==========================================

// Get recent error logs
router.get('/logs', async (req, res) => {
  try {
    const [logs] = await db.query('SELECT * FROM error_logs ORDER BY timestamp DESC LIMIT 50');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving logs' });
  }
});

// Full database backup export
router.get('/backup', async (req, res) => {
  try {
    // Export core tables
    const [users] = await db.query('SELECT id, name, email, role, status, created_at FROM users');
    const [trips] = await db.query('SELECT * FROM trips');
    const [itineraries] = await db.query('SELECT * FROM itineraries');
    const [expenses] = await db.query('SELECT * FROM expenses');

    const backupData = {
      timestamp: new Date(),
      platform: 'Traveloop',
      data: {
        users,
        trips,
        itineraries,
        expenses
      }
    };

    res.json(backupData);
  } catch (err) {
    res.status(500).json({ message: 'Server error generating backup' });
  }
});

module.exports = router;
