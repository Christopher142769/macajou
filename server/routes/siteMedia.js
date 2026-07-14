const express = require('express');
const SiteMedia = require('../models/SiteMedia');
const SLOTS = require('../mediaSlots');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function ensureSlots() {
  for (const slot of SLOTS) {
    await SiteMedia.findOneAndUpdate(
      { key: slot.key },
      {
        $setOnInsert: { url: '', kind: slot.kind },
        $set: { section: slot.section, label: slot.label },
      },
      { upsert: true, new: true }
    );
  }
}

router.get('/', async (_req, res) => {
  try {
    await ensureSlots();
    const items = await SiteMedia.find().lean();
    const byKey = Object.fromEntries(items.map((i) => [i.key, i]));
    const ordered = SLOTS.map((s) => byKey[s.key]).filter(Boolean);
    res.json(ordered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/map', async (_req, res) => {
  try {
    await ensureSlots();
    const items = await SiteMedia.find({ url: { $ne: '' } }).lean();
    const map = {};
    for (const item of items) map[item.key] = { url: item.url, alt: item.alt, kind: item.kind };
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function detectKind(url, fallback) {
  if (/\/video\/upload\//i.test(url || '')) return 'video';
  if (/\/image\/upload\//i.test(url || '')) return 'image';
  if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(url || '')) return 'video';
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(url || '')) return 'image';
  return fallback || 'image';
}

router.put('/:key', requireAuth, async (req, res) => {
  try {
    const slot = SLOTS.find((s) => s.key === req.params.key);
    if (!slot) return res.status(404).json({ error: 'Emplacement inconnu' });
    const update = {};
    if (typeof req.body.url === 'string') update.url = req.body.url.trim();
    if (typeof req.body.alt === 'string') update.alt = req.body.alt.trim();
    if (['image', 'video'].includes(req.body.kind)) update.kind = req.body.kind;
    // N'importe quelle section accepte image OU vidéo : le type suit le fichier.
    const kind = update.kind || (update.url ? detectKind(update.url, slot.kind) : slot.kind);
    const item = await SiteMedia.findOneAndUpdate(
      { key: slot.key },
      {
        $set: {
          ...update,
          section: slot.section,
          label: slot.label,
          kind,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:key/clear', requireAuth, async (req, res) => {
  try {
    const item = await SiteMedia.findOneAndUpdate(
      { key: req.params.key },
      { $set: { url: '' } },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Introuvable' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
module.exports.ensureSlots = ensureSlots;
