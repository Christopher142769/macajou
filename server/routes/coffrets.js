const express = require('express');
const slugify = require('slugify');
const Coffret = require('../models/Coffret');
const { CAPACITIES, KINDS, CAPACITY_MIN, CAPACITY_MAX } = require('../models/Coffret');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toSlug(name) {
  return slugify(name, { lower: true, strict: true, locale: 'fr' });
}

function normalizeKind(value) {
  const k = String(value || 'coffret').toLowerCase();
  return KINDS.includes(k) ? k : 'coffret';
}

function isValidCapacity(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= CAPACITY_MIN && n <= CAPACITY_MAX;
}

function kindFilter(kindQuery) {
  if (!kindQuery) return {};
  const kind = normalizeKind(kindQuery);
  if (kind === 'coffret') {
    return { $or: [{ kind: 'coffret' }, { kind: { $exists: false } }, { kind: null }, { kind: '' }] };
  }
  return { kind };
}

function normalizeBody(body) {
  const data = { ...body };
  data.slug = data.slug || toSlug(data.name || '');
  data.capacity = Math.round(Number(data.capacity));
  data.price = Number(data.price);
  if (data.kind != null) data.kind = normalizeKind(data.kind);
  if (data.featured != null) data.featured = !!data.featured;
  if (data.limitedEdition != null) data.limitedEdition = !!data.limitedEdition;
  if (data.active != null) data.active = !!data.active;
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
  if (data.limitedEdition) {
    if (!data.badge) data.badge = 'Édition limitée';
    if (!data.shortDescription) {
      data.shortDescription =
        'Édition limitée pour les occasions — emballage spécial (hors packaging Macajou classique).';
    }
  }
  return data;
}

router.get('/capacities', (_req, res) => {
  res.json(CAPACITIES);
});

router.get('/', async (req, res) => {
  try {
    const filter = { active: true, ...kindFilter(req.query.kind) };
    const items = await Coffret.find(filter).sort({ order: 1, capacity: 1, createdAt: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/all', requireAuth, async (req, res) => {
  try {
    const filter = kindFilter(req.query.kind);
    const items = await Coffret.find(filter).sort({ kind: 1, order: 1, capacity: 1, createdAt: -1 });
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
    if (!isValidCapacity(data.capacity)) {
      return res.status(400).json({
        error: `Capacité invalide : indiquez un nombre entier entre ${CAPACITY_MIN} et ${CAPACITY_MAX}`,
      });
    }
    if (!data.name || Number.isNaN(data.price)) {
      return res.status(400).json({ error: 'Nom et prix requis' });
    }
    data.kind = normalizeKind(data.kind);
    const item = await Coffret.create(data);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const data = normalizeBody(req.body);
    if (data.capacity != null && !isValidCapacity(data.capacity)) {
      return res.status(400).json({
        error: `Capacité invalide : indiquez un nombre entier entre ${CAPACITY_MIN} et ${CAPACITY_MAX}`,
      });
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
  if (count === 0) {
    const defaults = [
      { capacity: 4, price: 3500, badge: 'Découverte', desc: '4 macajoux à composer selon vos envies.', featured: true },
      { capacity: 8, price: 6500, badge: 'Essentiel', desc: '8 macajoux à composer selon vos envies.', featured: true },
      {
        capacity: 10,
        price: 8000,
        badge: 'Édition limitée',
        desc: 'Édition limitée pour les occasions — emballage spécial (hors packaging Macajou classique).',
        featured: false,
        limitedEdition: true,
        image: '',
      },
      { capacity: 16, price: 12000, badge: 'Partage', desc: '16 macajoux à composer selon vos envies.', featured: false },
      { capacity: 18, price: 13500, badge: 'Grande fête', desc: '18 macajoux à composer selon vos envies.', featured: false },
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
        shortDescription: d.desc,
        image: d.image || '',
        images: d.image ? [d.image] : [],
        order: i,
        kind: 'coffret',
        featured: d.featured,
        limitedEdition: !!d.limitedEdition,
        active: true,
      });
    }
  }

  await Coffret.updateMany(
    { $or: [{ kind: { $exists: false } }, { kind: null }, { kind: '' }] },
    { $set: { kind: 'coffret' } }
  );

  // Coffret 10 historique → édition limitée (sans écraser un décochage volontaire)
  await Coffret.updateMany(
    {
      capacity: 10,
      $or: [{ limitedEdition: { $exists: false } }, { limitedEdition: null }],
    },
    {
      $set: {
        limitedEdition: true,
        badge: 'Édition limitée',
        shortDescription:
          'Édition limitée pour les occasions — emballage spécial (hors packaging Macajou classique).',
      },
    }
  );

  // Ne plus forcer l'illustration SVG : garder la vraie photo du coffret / produit
  const limitedArt = '/assets/edition-limitee.svg';
  await Coffret.updateMany({ image: limitedArt }, { $set: { image: '' } });
  await Coffret.updateMany({ images: limitedArt }, { $pull: { images: limitedArt } });
  const Product = require('../models/Product');
  await Product.updateMany({ images: limitedArt }, { $pull: { images: limitedArt } });
}

module.exports = router;
module.exports.ensureDefaults = ensureDefaults;
module.exports.CAPACITIES = CAPACITIES;
