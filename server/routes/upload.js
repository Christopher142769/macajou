const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { storeFile } = require('../services/cloudinary');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'video/mp4' ||
      file.mimetype === 'video/webm' ||
      file.mimetype === 'video/quicktime';
    if (!ok) return cb(new Error('Images ou vidéos (mp4/webm) uniquement'));
    cb(null, true);
  },
});

router.post('/', requireAuth, upload.array('images', 8), async (req, res) => {
  try {
    const assets = [];
    for (const file of req.files || []) assets.push(await storeFile(file));
    res.status(201).json({ urls: assets.map((asset) => asset.url), assets });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/one', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });
    const asset = await storeFile(req.file);
    res.status(201).json({ url: asset.url, asset });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
