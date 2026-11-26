const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const db = require('./db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const resend = new Resend(process.env.RESEND_API_KEY);
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST /auth/register
router.post('/register', (req, res) => {
  const { username, email, password } = req.body; // <-- Add email here
  if (!username || !password || password.length < 4) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    // Add email to the INSERT query
    const info = db.prepare(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
    ).run(username, email, hash);
    const token = jwt.sign({ id: info.lastInsertRowid }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username, balance: 10000 });
  } catch (e) {
    res.status(400).json({ error: 'Username or Email already taken' });
  }
});

// POST /auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid login' });
  }
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username, balance: user.balance });
});

// Middleware to verify JWT on protected routes
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(header.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Bad token' });
  }
}

// GET /auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, balance FROM users WHERE id = ?')
    .get(req.user.id);
  res.json(user);
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  // Check if user exists
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    // For security, don't reveal if email exists or not, just say "sent"
    return res.json({ message: 'If that email is registered, a reset link has been sent.' });
  }

  // Generate a secure random token
  const token = crypto.randomBytes(20).toString('hex');
  // Token expires in 1 hour
  const expires = Date.now() + 3600000; 

  // Save token to database
  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?')
    .run(token, expires, user.id);

  // Create the reset URL (points to your frontend)
  const resetUrl = `http://localhost:5173/reset-password?token=${token}`;

  // Send the email
    try {
    await resend.emails.send({
      from: 'GeraldX <onboarding@resend.dev>', // <-- Resend's free test domain
      to: user.email,
      subject: 'Password Reset Request - GeraldX',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #0f1115; color: white;">
          <h2 style="color: #22c55e;">GeraldX Password Reset</h2>
          <p>You requested to reset your password. Click the button below to set a new one.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #22c55e; color: black; font-weight: bold; text-decoration: none; border-radius: 8px; margin-top: 10px;">Reset Password</a>
          <p style="margin-top: 20px; font-size: 12px; color: #888;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (error) {
    console.error('Email send failed:', error);
    // Send the actual error message to the frontend for debugging
    res.status(500).json({ error: error.message || 'Failed to send email.' });
  }
});

// POST /auth/reset-password
router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  // Find user with this token and check if token is expired
  const user = db.prepare('SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?')
    .get(token, Date.now());

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  // Hash the new password and update the user, clearing the token
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
    .run(hash, user.id);

  res.json({ message: 'Password updated successfully. You can now login.' });
});

module.exports = { router, authMiddleware, JWT_SECRET };