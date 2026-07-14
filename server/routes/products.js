const express = require('express');
const slugify = require('slugify');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toSlug(name) {
  return slugify(name, { lower: true, strict: true, locale: 'fr' });
}

async function validateCategory(name) {
  const category = await Category.findOne({ name, active: true });
  if (!category) throw new Error('Sélectionnez une catégorie active');
}

router.get('/', async (req, res) => {
  try {
    const filter = { active: true };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.featured === '1') filter.featured = true;
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/slug/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, active: true });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/all', requireAuth, async (_req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const body = { ...req.body };
    body.slug = body.slug || toSlug(body.name);
    await validateCategory(body.category);
    if (typeof body.flavors === 'string') {
      try {
        body.flavors = JSON.parse(body.flavors);
      } catch {
        body.flavors = [];
      }
    }
    if (typeof body.images === 'string') {
      try {
        body.images = JSON.parse(body.images);
      } catch {
        body.images = body.images ? [body.images] : [];
      }
    }
    const product = await Product.create(body);
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.name && !body.slug) body.slug = toSlug(body.name);
    if (body.category) await validateCategory(body.category);
    if (typeof body.flavors === 'string') {
      try {
        body.flavors = JSON.parse(body.flavors);
      } catch {
        /* keep as-is */
      }
    }
    if (typeof body.images === 'string') {
      try {
        body.images = JSON.parse(body.images);
      } catch {
        /* keep as-is */
      }
    }
    const product = await Product.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
