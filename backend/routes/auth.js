const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth');
require('dotenv').config();

// @route   POST api/auth/signup
// @desc    Register user
// @access  Public
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    // Check for existing user
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user (generate simple mock username from name)
    const username = name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);
    
    const role = email.toLowerCase() === 'admin@traveloop.com' ? 'admin' : 'traveler';

    await db.query(
      'INSERT INTO users (name, email, password, username, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, username, role]
    );

    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    // Check for user
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT Payload
    const payload = {
      user: {
        id: user.id,
        email: user.email
      }
    };

    // Sign Token
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'traveloop_super_secret_key_123!',
      { expiresIn: '7d' },
      async (err, token) => {
        if (err) throw err;

        // Record a new login session for active sessions tab
        const sessionId = 'sess-' + Date.now();
        
        // Mark all other sessions of this user as current = false
        await db.query('UPDATE user_sessions SET current = 0 WHERE user_id = ?', [user.id]);

        // Insert new session
        const userAgent = req.headers['user-agent'] || 'Unknown Device';
        let device = 'desktop';
        if (/mobile/i.test(userAgent)) device = 'mobile';
        if (/tablet/i.test(userAgent)) device = 'tablet';

        let osBrowser = 'Chrome on Windows';
        if (/macintosh/i.test(userAgent)) osBrowser = 'Safari on MacOS';
        if (/android/i.test(userAgent)) osBrowser = 'Chrome on Android';
        if (/iphone/i.test(userAgent)) osBrowser = 'Safari on iPhone';
        if (/firefox/i.test(userAgent)) osBrowser = 'Firefox';

        await db.query(
          'INSERT INTO user_sessions (id, user_id, device, name, location, lastActive, current) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [sessionId, user.id, device, osBrowser, 'Delhi, India', 'Active now', 1]
        );

        // Remove sensitive fields
        const { password: _, ...userWithoutPassword } = user;

        res.json({
          token,
          user: userWithoutPassword
        });
      }
    );
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   PUT api/auth/password
// @desc    Change password
// @access  Private
router.put('/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    // Get user from DB
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update DB
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error updating password' });
  }
});

// @route   DELETE api/auth/account
// @desc    Delete user account
// @access  Private
router.delete('/account', auth, async (req, res) => {
  try {
    // CASCADE will handle deleting trips, sessions, checklist, notes, itineraries, expenses
    await db.query('DELETE FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ message: 'Server error deleting account' });
  }
});

// @route   GET api/auth/users
// @desc    Get all users for admin dashboard
// @access  Public (simplified, matched with mock localStorage design)
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.query('SELECT name, email, role FROM users');
    res.json(users);
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({ message: 'Server error retrieving users' });
  }
});

module.exports = router;
