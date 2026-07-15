const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { sendLoginCode } = require('../services/mailer');

const router = express.Router();

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function sessionToken(admin) {
  return jwt.sign(
    { id: admin._id, email: admin.email, name: admin.name },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: (email || '').toLowerCase().trim() });
    if (!admin || !(await admin.verifyPassword(password || ''))) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    const code = crypto.randomInt(100000, 1000000).toString();
    admin.otpHash = hashCode(code);
    admin.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    admin.otpAttempts = 0;
    await admin.save();
    let emailSent = false;
    try {
      await sendLoginCode({ to: admin.email, code });
      emailSent = true;
    } catch (emailErr) {
      console.error('Envoi email OTP échoué :', emailErr.message);
    }
    const challengeToken = jwt.sign(
      { id: admin._id, purpose: 'login-otp' },
      config.jwtSecret,
      { expiresIn: '10m' }
    );
    res.json({
      requiresCode: true,
      challengeToken,
      emailHint: admin.email.replace(/^(.{2}).*(@.*)$/, '$1••••$2'),
      fallbackCode: emailSent ? undefined : code,
      emailFailed: !emailSent,
    });
  } catch (err) {
    console.error('Échec de connexion ou envoi OTP :', err);
    res.status(500).json({ error: "Impossible d'envoyer le code de connexion" });
  }
});

router.post('/verify-code', async (req, res) => {
  try {
    const { challengeToken, code } = req.body;
    if (!challengeToken || !/^\d{6}$/.test(String(code || ''))) {
      return res.status(400).json({ error: 'Saisissez le code à 6 chiffres' });
    }
    let challenge;
    try {
      challenge = jwt.verify(challengeToken, config.jwtSecret);
    } catch {
      return res.status(401).json({ error: 'Code expiré. Recommencez la connexion.' });
    }
    if (challenge.purpose !== 'login-otp') {
      return res.status(401).json({ error: 'Demande de connexion invalide' });
    }
    const admin = await Admin.findById(challenge.id);
    if (!admin || !admin.otpHash || !admin.otpExpiresAt || admin.otpExpiresAt < new Date()) {
      return res.status(401).json({ error: 'Code expiré. Recommencez la connexion.' });
    }
    if (admin.otpAttempts >= 5) {
      return res.status(429).json({ error: 'Trop de tentatives. Recommencez la connexion.' });
    }
    if (hashCode(code) !== admin.otpHash) {
      admin.otpAttempts += 1;
      await admin.save();
      return res.status(401).json({ error: 'Code incorrect' });
    }
    admin.otpHash = '';
    admin.otpExpiresAt = null;
    admin.otpAttempts = 0;
    await admin.save();
    res.json({
      token: sessionToken(admin),
      admin: { email: admin.email, name: admin.name },
    });
  } catch (err) {
    console.error('Échec de validation OTP :', err);
    res.status(500).json({ error: 'Validation impossible' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const admin = await Admin.findById(req.admin.id).select('-passwordHash');
  if (!admin) return res.status(401).json({ error: 'Compte introuvable' });
  res.json(admin);
});

module.exports = router;
