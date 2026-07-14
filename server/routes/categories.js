const express = require('express');
const slugify = require('slugify');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const DEFAULTS = ['Macajoux', 'Croquants', 'Pralines', 'Tartinables', 'Coffrets', 'Autres'];

function toSlug(name) {
  return slugify(name, { lower: true, strict: true, locale: 'fr' });
}

async function ensureDefaults() {
  if (await Category.exists({})) return;
  await Category.insertMany(
    DEFAULTS.map((name, order) => ({ name, slug: toSlug(name), order, active: true }))
  );
}

router.get('/', async (_req, res) => {
  try {
    await ensureDefaults();
    res.json(await Category.find({ active: true }).sort({ order: 1, name: 1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/all', requireAuth, async (_req, res) => {
  try {
    await ensureDefaults();
    res.json(await Category.find().sort({ order: 1, name: 1 }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Le nom de la catégorie est requis' });
    const category = await Category.create({
      name,
      slug: toSlug(name),
      order: Number(req.body.order) || 0,
      active: req.body.active !== false,
    });
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({
      error: err.code === 11000 ? 'Cette catégorie existe déjà' : err.message,
    });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const current = await Category.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Catégorie introuvable' });
    const previousName = current.name;
    const name = String(req.body.name || current.name).trim();
    current.name = name;
    current.slug = toSlug(name);
    if (req.body.order !== undefined) current.order = Number(req.body.order) || 0;
    if (req.body.active !== undefined) current.active = Boolean(req.body.active);
    await current.save();
    if (previousName !== name) {
      await Product.updateMany({ category: previousName }, { $set: { category: name } });
    }
    res.json(current);
  } catch (err) {
    res.status(400).json({
      error: err.code === 11000 ? 'Cette catégorie existe déjà' : err.message,
    });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Catégorie introuvable' });
    const used = await Product.countDocuments({ category: category.name });
    if (used) {
      return res.status(409).json({
        error: `Impossible de supprimer : ${used} produit(s) utilisent cette catégorie`,
      });
    }
    await category.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.ensureDefaults = ensureDefaults;
