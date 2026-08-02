const express = require('express');
const slugify = require('slugify');
const ClubPost = require('../models/ClubPost');
const ClubRsvp = require('../models/ClubRsvp');
const { TYPES } = require('../models/ClubPost');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toSlug(name) {
  return slugify(name, { lower: true, strict: true, locale: 'fr' });
}

function normalizeBody(body) {
  const data = { ...body };
  data.slug = data.slug || toSlug(data.name || data.title || '');
  if (data.eventDate === '' || data.eventDate == null) data.eventDate = null;
  else if (data.eventDate) data.eventDate = new Date(data.eventDate);
  data.order = Number(data.order) || 0;
  data.active = data.active !== false && data.active !== 'false';
  data.showPopup = data.showPopup !== false && data.showPopup !== 'false';
  return data;
}

router.get('/types', (_req, res) => {
  res.json(TYPES);
});

router.get('/', async (_req, res) => {
  try {
    const items = await ClubPost.find({ active: true }).sort({ order: 1, createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/popup', async (_req, res) => {
  try {
    const items = await ClubPost.find({ active: true, showPopup: true }).sort({
      order: 1,
      createdAt: -1,
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/rsvp', async (req, res) => {
  try {
    const post = await ClubPost.findOne({ _id: req.params.id, active: true, type: 'event' });
    if (!post) return res.status(404).json({ error: 'Événement introuvable' });

    const { firstName, lastName, email, phone } = req.body || {};
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: 'Nom, prénom, e-mail et téléphone requis' });
    }

    const rsvp = await ClubRsvp.create({
      clubPost: post._id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
    });
    res.status(201).json({ ok: true, id: rsvp._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/admin/all', requireAuth, async (_req, res) => {
  try {
    const items = await ClubPost.find().sort({ order: 1, createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/rsvps', requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.postId) filter.clubPost = req.query.postId;
    const items = await ClubRsvp.find(filter)
      .populate('clubPost', 'title type eventDate')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await ClubPost.findOne({ _id: req.params.id, active: true });
    if (!item) return res.status(404).json({ error: 'Publication introuvable' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const data = normalizeBody(req.body);
    if (!data.title?.trim()) return res.status(400).json({ error: 'Titre requis' });
    if (!TYPES.includes(data.type)) return res.status(400).json({ error: 'Type invalide' });
    const item = await ClubPost.create(data);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const data = normalizeBody(req.body);
    if (data.type && !TYPES.includes(data.type)) {
      return res.status(400).json({ error: 'Type invalide' });
    }
    const item = await ClubPost.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ error: 'Publication introuvable' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const item = await ClubPost.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Publication introuvable' });
    await ClubRsvp.deleteMany({ clubPost: item._id });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

async function ensureDefaults() {
  // Retire les publications démo seedées précédemment (aucun contenu fictif).
  const seeds = await ClubPost.find({
    slug: { $in: ['soiree-decouverte-macajou', 'macajou-pistache-coming-soon'] },
  }).select('_id');
  if (!seeds.length) return;
  const ids = seeds.map((s) => s._id);
  await ClubRsvp.deleteMany({ clubPost: { $in: ids } });
  await ClubPost.deleteMany({ _id: { $in: ids } });
}

module.exports = router;
module.exports.ensureDefaults = ensureDefaults;
