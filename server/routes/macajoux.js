const express = require('express');
const slugify = require('slugify');
const Macajou = require('../models/Macajou');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toSlug(name) {
  return slugify(name, { lower: true, strict: true, locale: 'fr' });
}

function parseStock(value) {
  if (value === '' || value == null) return null;
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function normalizeBody(body, { partial = false } = {}) {
  const data = { ...body };
  delete data._id;
  if (data.slug || data.name != null) data.slug = data.slug || toSlug(data.name || '');
  else if (!partial) data.slug = '';
  if (data.active != null) data.active = !!data.active;
  if (data.available != null) data.available = !!data.available;
  if ('stock' in data) data.stock = parseStock(data.stock);
  return data;
}

router.get('/', async (_req, res) => {
  try {
    const items = await Macajou.find({ active: true }).sort({ order: 1, name: 1 });
    res.json(items.map((m) => ({ ...m.toObject(), available: m.available !== false && m.stock !== 0 })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/all', requireAuth, async (_req, res) => {
  try {
    const items = await Macajou.find().sort({ order: 1, name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await Macajou.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Macajou introuvable' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const data = normalizeBody(req.body);
    if (!data.name) return res.status(400).json({ error: 'Nom requis' });
    const item = await Macajou.create(data);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const data = normalizeBody(req.body, { partial: true });
    const item = await Macajou.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ error: 'Macajou introuvable' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const item = await Macajou.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Macajou introuvable' });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

async function ensureDefaults() {
  const count = await Macajou.countDocuments();
  if (count > 0) return;
  const names = [
    'Chocolat',
    'Pistache',
    'Rose',
    'Citron',
    'Caramel',
    'Cajou nature',
    'Passion',
    'Vanille',
  ];
  for (let i = 0; i < names.length; i++) {
    await Macajou.create({
      name: names[i],
      slug: toSlug(names[i]),
      order: i,
      active: true,
      available: true,
      description: `Macajou ${names[i].toLowerCase()} artisanal.`,
    });
  }
}

module.exports = router;
module.exports.ensureDefaults = ensureDefaults;
