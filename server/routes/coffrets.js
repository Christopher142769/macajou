const express = require('express');
const slugify = require('slugify');
const Coffret = require('../models/Coffret');
const { CAPACITIES } = require('../models/Coffret');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toSlug(name) {
  return slugify(name, { lower: true, strict: true, locale: 'fr' });
}

function normalizeBody(body) {
  const data = { ...body };
  data.slug = data.slug || toSlug(data.name || '');
  data.capacity = Number(data.capacity);
  data.price = Number(data.price);
  if (data.images && typeof data.images === 'string') {
    try {
      data.images = JSON.parse(data.images);
    } catch {
      data.images = data.images ? [data.images] : [];
    }
  }
  if (!data.image && Array.isArray(data.images) && data.images[0]) {
    data.image = data.images[0];
  }
  if (data.image && (!data.images || !data.images.length)) {
    data.images = [data.image];
  }
  return data;
}

router.get('/capacities', (_req, res) => {
  res.json(CAPACITIES);
});

router.get('/', async (_req, res) => {
  try {
    const items = await Coffret.find({ active: true }).sort({ order: 1, capacity: 1, createdAt: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/all', requireAuth, async (_req, res) => {
  try {
    const items = await Coffret.find().sort({ order: 1, capacity: 1, createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/slug/:slug', async (req, res) => {
  try {
    const item = await Coffret.findOne({ slug: req.params.slug, active: true });
    if (!item) return res.status(404).json({ error: 'Coffret introuvable' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await Coffret.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Coffret introuvable' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const data = normalizeBody(req.body);
    if (!CAPACITIES.includes(data.capacity)) {
      return res.status(400).json({ error: `Capacité invalide (${CAPACITIES.join(', ')})` });
    }
    if (!data.name || Number.isNaN(data.price)) {
      return res.status(400).json({ error: 'Nom et prix requis' });
    }
    const item = await Coffret.create(data);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const data = normalizeBody(req.body);
    if (data.capacity != null && !CAPACITIES.includes(data.capacity)) {
      return res.status(400).json({ error: `Capacité invalide (${CAPACITIES.join(', ')})` });
    }
    const item = await Coffret.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ error: 'Coffret introuvable' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const item = await Coffret.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Coffret introuvable' });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

async function ensureDefaults() {
  const count = await Coffret.countDocuments();
  if (count > 0) return;
  const defaults = [
    { capacity: 4, price: 3500, badge: 'Découverte' },
    { capacity: 8, price: 6500, badge: 'Essentiel' },
    { capacity: 10, price: 8000, badge: 'Signature' },
    { capacity: 16, price: 12000, badge: 'Partage' },
    { capacity: 18, price: 13500, badge: 'Grande fête' },
  ];
  for (let i = 0; i < defaults.length; i++) {
    const d = defaults[i];
    const name = `Coffret de ${d.capacity}`;
    await Coffret.create({
      name,
      slug: toSlug(name),
      capacity: d.capacity,
      price: d.price,
      badge: d.badge,
      shortDescription: `${d.capacity} macajoux à composer selon vos envies.`,
      order: i,
      featured: true,
      active: true,
    });
  }
}

module.exports = router;
module.exports.ensureDefaults = ensureDefaults;
module.exports.CAPACITIES = CAPACITIES;
