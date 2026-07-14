const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: (email || '').toLowerCase().trim() });
    if (!admin || !(await admin.verifyPassword(password || ''))) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }
    const token = jwt.sign(
      { id: admin._id, email: admin.email, name: admin.name },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    res.json({ token, admin: { email: admin.email, name: admin.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const admin = await Admin.findById(req.admin.id).select('-passwordHash');
  if (!admin) return res.status(401).json({ error: 'Compte introuvable' });
  res.json(admin);
});

module.exports = router;
