const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth');
require('dotenv').config();
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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

// @route   POST api/auth/forgot-password
// @desc    Send password reset email
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const [users] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });
    const userId = users[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db.query('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)', [userId, token, expires]);
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const mailOptions = {
      from: `"TravelLoop Support" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset. Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`
    };
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/auth/reset-password
// @desc    Reset password using token
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password required' });
  try {
    const [rows] = await db.query('SELECT user_id, expires_at FROM password_resets WHERE token = ?', [token]);
    if (rows.length === 0) return res.status(400).json({ message: 'Invalid or expired token' });
    const reset = rows[0];
    if (new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Token has expired' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, reset.user_id]);
    await db.query('DELETE FROM password_resets WHERE token = ?', [token]);
    res.json({ message: 'Password has been reset' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
