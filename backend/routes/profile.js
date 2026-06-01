const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// Helper to format database user row into nested frontend object structure
function formatUserObject(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    username: user.username || '',
    bio: user.bio || '',
    phone: user.phone || '',
    dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : null,
    homecity: user.homecity || '',
    website: user.website || '',
    role: user.role,
    settings: {
      language: user.settings_language || 'English',
      currency: user.settings_currency || 'INR',
      dateFormat: user.settings_dateformat || 'DD/MM/YYYY',
      timeFormat: user.settings_timeformat || '12 hour',
      units: user.settings_units || 'Metric',
      twoFactorEnabled: !!user.two_factor_enabled,
      notifications: {
        email: !!user.notif_email,
        reminders: !!user.notif_reminders,
        recommendations: !!user.notif_recommendations,
        budget: !!user.notif_budget
      },
      privacy: {
        publicProfile: !!user.priv_public,
        searchResults: !!user.priv_search,
        travelStats: !!user.priv_stats
      }
    }
  };
}

// @route   GET api/profile/announcements
// @desc    Get active global announcements
// @access  Private
router.get('/announcements', auth, async (req, res) => {
  try {
    const [announcements] = await db.query('SELECT * FROM announcements WHERE active = 1 ORDER BY created_at DESC LIMIT 1');
    res.json(announcements);
  } catch (err) {
    console.error('Get announcements error:', err);
    res.status(500).json({ message: 'Server error fetching announcements' });
  }
});

// @route   GET api/profile/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(formatUserObject(users[0]));
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// @route   PUT api/profile
// @desc    Update profile biography, details, name, avatar
// @access  Private
router.put('/', auth, async (req, res) => {
  const { name, username, bio, phone, dob, homecity, website, avatar, password } = req.body;

  try {
    // Basic verification on username uniqueness if it changed
    if (username) {
      const [existing] = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.user.id]);
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
    }

    // Build dynamic UPDATE query
    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (username !== undefined) { updates.push('username = ?'); params.push(username); }
    if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (dob !== undefined) { updates.push('dob = ?'); params.push(dob ? new Date(dob) : null); }
    if (homecity !== undefined) { updates.push('homecity = ?'); params.push(homecity); }
    if (website !== undefined) { updates.push('website = ?'); params.push(website); }
    if (avatar !== undefined) { updates.push('avatar = ?'); params.push(avatar); }

    if (password) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (updates.length > 0) {
      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      params.push(req.user.id);
      await db.query(query, params);
    }

    // Fetch and return updated user
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, user: formatUserObject(users[0]) });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// @route   PUT api/profile/settings
// @desc    Update language, currency, units, formats
// @access  Private
router.put('/settings', auth, async (req, res) => {
  const { language, currency, dateFormat, timeFormat, units } = req.body;

  try {
    await db.query(
      'UPDATE users SET settings_language = ?, settings_currency = ?, settings_dateformat = ?, settings_timeformat = ?, settings_units = ? WHERE id = ?',
      [language, currency, dateFormat, timeFormat, units, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ message: 'Server error updating preferences' });
  }
});

// @route   PATCH api/profile/notifications
// @desc    Toggle user notifications settings
// @access  Private
router.patch('/notifications', auth, async (req, res) => {
  const notifData = req.body; // e.g. { email: true } or { budget: false }
  
  const key = Object.keys(notifData)[0];
  const value = notifData[key] ? 1 : 0;

  let dbField;
  if (key === 'email') dbField = 'notif_email';
  else if (key === 'reminders') dbField = 'notif_reminders';
  else if (key === 'recommendations') dbField = 'notif_recommendations';
  else if (key === 'budget') dbField = 'notif_budget';

  if (!dbField) {
    return res.status(400).json({ message: 'Invalid notification key' });
  }

  try {
    await db.query(`UPDATE users SET ${dbField} = ? WHERE id = ?`, [value, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Update notifications error:', err);
    res.status(500).json({ message: 'Server error updating notifications' });
  }
});

// @route   PATCH api/profile/privacy
// @desc    Toggle privacy settings
// @access  Private
router.patch('/privacy', auth, async (req, res) => {
  const { publicProfile, searchResults, travelStats } = req.body;

  try {
    await db.query(
      'UPDATE users SET priv_public = ?, priv_search = ?, priv_stats = ? WHERE id = ?',
      [publicProfile ? 1 : 0, searchResults ? 1 : 0, travelStats ? 1 : 0, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update privacy error:', err);
    res.status(500).json({ message: 'Server error updating privacy' });
  }
});

// @route   PUT api/profile/2fa
// @desc    Toggle two-factor authentication
// @access  Private
router.put('/2fa', auth, async (req, res) => {
  const { enabled } = req.body;

  try {
    await db.query(
      'UPDATE users SET two_factor_enabled = ? WHERE id = ?',
      [enabled ? 1 : 0, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Toggle 2FA error:', err);
    res.status(500).json({ message: 'Server error toggling 2FA' });
  }
});


// @route   GET api/profile/sessions
// @desc    Get active device login sessions
// @access  Private
router.get('/sessions', auth, async (req, res) => {
  try {
    const [sessions] = await db.query(
      'SELECT id, device, name, location, lastActive, current FROM user_sessions WHERE user_id = ?',
      [req.user.id]
    );
    
    // Map current 1/0 to true/false
    const sessionsMapped = sessions.map(s => ({
      ...s,
      current: !!s.current
    }));

    res.json(sessionsMapped);
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ message: 'Server error fetching sessions' });
  }
});

// @route   DELETE api/profile/sessions/:id
// @desc    Revoke session
// @access  Private
router.delete('/sessions/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM user_sessions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Revoke session error:', err);
    res.status(500).json({ message: 'Server error revoking session' });
  }
});

// @route   DELETE api/profile/sessions
// @desc    Logout other devices (revoke all except active session)
// @access  Private
router.delete('/sessions', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM user_sessions WHERE user_id = ? AND current = 0', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Revoke all sessions error:', err);
    res.status(500).json({ message: 'Server error revoking other sessions' });
  }
});

// @route   GET api/profile/saved-cities
// @desc    Get saved cities
// @access  Private
router.get('/saved-cities', auth, async (req, res) => {
  try {
    const [cities] = await db.query(
      'SELECT id, name, country FROM saved_cities WHERE user_id = ?',
      [req.user.id]
    );
    res.json(cities);
  } catch (err) {
    console.error('Get saved cities error:', err);
    res.status(500).json({ message: 'Server error fetching saved cities' });
  }
});

// @route   POST api/profile/saved-cities
// @desc    Save a bookmarked city
// @access  Private
router.post('/saved-cities', auth, async (req, res) => {
  const { name, country } = req.body;
  if (!name || !country) {
    return res.status(400).json({ message: 'City name and country required' });
  }

  try {
    // Avoid duplicates
    const [existing] = await db.query('SELECT * FROM saved_cities WHERE user_id = ? AND name = ? AND country = ?', [req.user.id, name, country]);
    if (existing.length > 0) {
      return res.json(existing[0]); // Return existing
    }

    const [result] = await db.query(
      'INSERT INTO saved_cities (user_id, name, country) VALUES (?, ?, ?)',
      [req.user.id, name, country]
    );

    res.status(201).json({ id: result.insertId, name, country });
  } catch (err) {
    console.error('Save city error:', err);
    res.status(500).json({ message: 'Server error saving destination' });
  }
});

// @route   DELETE api/profile/saved-cities/:id
// @desc    Remove bookmarked city
// @access  Private
router.delete('/saved-cities/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM saved_cities WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete saved city error:', err);
    res.status(500).json({ message: 'Server error removing bookmark' });
  }
});

// @route   GET api/profile/export
// @desc    Export complete user data as JSON
// @access  Private
router.get('/export', auth, async (req, res) => {
  try {
    // 1. User profile info
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = formatUserObject(users[0]);

    // 2. Saved Cities
    const [cities] = await db.query('SELECT name, country FROM saved_cities WHERE user_id = ?', [req.user.id]);

    // 3. Trips, itineraries, expenses, checklist, notes
    const [trips] = await db.query(
      'SELECT id, name, destination, startDate, endDate, travelers, budget, description FROM trips WHERE user_id = ?',
      [req.user.id]
    );

    const fullTrips = await Promise.all(trips.map(async trip => {
      const [itinerary] = await db.query('SELECT city, date, activity, category, cost, duration FROM itineraries WHERE trip_id = ?', [trip.id]);
      const [expenses] = await db.query('SELECT description, amount, category, date, status FROM expenses WHERE trip_id = ?', [trip.id]);
      const [checklist] = await db.query('SELECT name, category, packed FROM checklists WHERE trip_id = ?', [trip.id]);
      const [notes] = await db.query('SELECT title, content, timestamp FROM notes WHERE trip_id = ?', [trip.id]);

      return {
        ...trip,
        itinerary,
        expenses,
        checklist: checklist.map(c => ({ ...c, packed: !!c.packed })),
        notes: notes.map(n => ({ ...n, timestamp: Number(n.timestamp) }))
      };
    }));

    res.json({
      profile: user,
      savedCities: cities,
      trips: fullTrips
    });
  } catch (err) {
    console.error('Export data error:', err);
    res.status(500).json({ message: 'Server error exporting account records' });
  }
});

module.exports = router;
