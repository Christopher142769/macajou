const express = require('express');
const SiteContent = require('../models/SiteContent');
const SLOTS = require('../textSlots');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function ensureSlots() {
  for (const slot of SLOTS) {
    await SiteContent.findOneAndUpdate(
      { key: slot.key },
      {
        $setOnInsert: { value: slot.defaultValue || '' },
        $set: {
          section: slot.section,
          label: slot.label,
          multiline: !!slot.multiline,
        },
      },
      { upsert: true, new: true }
    );
  }
}

router.get('/', async (_req, res) => {
  try {
    await ensureSlots();
    const items = await SiteContent.find().lean();
    const byKey = Object.fromEntries(items.map((i) => [i.key, i]));
    res.json(SLOTS.map((s) => byKey[s.key]).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/map', async (_req, res) => {
  try {
    await ensureSlots();
    const items = await SiteContent.find().lean();
    const map = {};
    for (const item of items) {
      if (item.value !== undefined && item.value !== null) map[item.key] = item.value;
    }
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:key', requireAuth, async (req, res) => {
  try {
    const slot = SLOTS.find((s) => s.key === req.params.key);
    if (!slot) return res.status(404).json({ error: 'Emplacement texte inconnu' });
    if (typeof req.body.value !== 'string') {
      return res.status(400).json({ error: 'Valeur texte requise' });
    }
    const item = await SiteContent.findOneAndUpdate(
      { key: slot.key },
      {
        $set: {
          value: req.body.value,
          section: slot.section,
          label: slot.label,
          multiline: !!slot.multiline,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:key/reset', requireAuth, async (req, res) => {
  try {
    const slot = SLOTS.find((s) => s.key === req.params.key);
    if (!slot) return res.status(404).json({ error: 'Emplacement texte inconnu' });
    const item = await SiteContent.findOneAndUpdate(
      { key: slot.key },
      {
        $set: {
          value: slot.defaultValue || '',
          section: slot.section,
          label: slot.label,
          multiline: !!slot.multiline,
        },
      },
      { upsert: true, new: true }
    );
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
module.exports.ensureSlots = ensureSlots;
