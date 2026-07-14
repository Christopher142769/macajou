const express = require('express');
const multer = require('multer');
const MediaAsset = require('../models/MediaAsset');
const Product = require('../models/Product');
const SiteMedia = require('../models/SiteMedia');
const { requireAuth } = require('../middleware/auth');
const { storeFile, destroyAsset } = require('../services/cloudinary');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    const allowed =
      file.mimetype.startsWith('image/') ||
      ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.mimetype);
    cb(allowed ? null : new Error('Images ou vidéos uniquement'), allowed);
  },
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (['image', 'video'].includes(req.query.type)) filter.resourceType = req.query.type;
    if (req.query.search) {
      filter.originalName = { $regex: String(req.query.search), $options: 'i' };
    }
    res.json(await MediaAsset.find(filter).sort({ createdAt: -1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, upload.array('files', 12), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: 'Sélectionnez au moins un fichier' });
    const assets = [];
    for (const file of req.files) assets.push(await storeFile(file));
    res.status(201).json(assets);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const asset = await MediaAsset.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Média introuvable' });
    const [productUse, siteUse] = await Promise.all([
      Product.countDocuments({ images: asset.url }),
      SiteMedia.countDocuments({ url: asset.url }),
    ]);
    if (productUse || siteUse) {
      return res.status(409).json({
        error: 'Ce média est utilisé sur le site ou par un produit. Remplacez-le avant de le supprimer.',
      });
    }
    await destroyAsset(asset);
    await asset.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.upload = upload;
