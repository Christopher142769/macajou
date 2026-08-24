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
  // Migrate legacy hero CTA label
  await SiteContent.findOneAndUpdate(
    { key: 'hero.cta', value: 'Découvrir' },
    { $set: { value: 'Je choisis mon coffret' } }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'hero.cta', value: 'Je compose mon coffret' },
    { $set: { value: 'Je choisis mon coffret' } }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'coffret.cta', value: 'Je compose' },
    { $set: { value: 'Je choisis' } }
  );
  const anciennesAnnonces = [
    '🥜 UNE PAUSE GOURMANDE MACAJOU, LIVRÉE EN 24H À COTONOU & CALAVI 🇧🇯',
    'Une pause gourmande Macajou livrée en 2h* (la majorité commande pour une consommation immédiate)\n*Sous réserve de…',
    'Une pause gourmande Macajou livrée en 2h à Cotonou & Calavi',
  ];
  await SiteContent.updateMany(
    { key: 'annonce.text', value: { $in: anciennesAnnonces } },
    { $set: { value: 'Une pause gourmande Macajou livrée en 2h sur Calavi et Cotonou' } }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'adresses.title', value: 'Nos points de vente\n& livraisons' },
    { $set: { value: 'Nos points de vente' } }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'adresses.cta', value: 'Je découvre' },
    { $set: { value: 'Localiser la boutique' } }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'adresses.cta', value: 'Voir la boutique' },
    { $set: { value: 'Localiser la boutique' } }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'collection.title', value: 'Collection Trésor du Bénin' },
    { $set: { value: 'Coffrets Macajou' } }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'collection.sur', value: "Fraîchement sortis de l'atelier" },
    { $set: { value: 'E-shop' } }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'collection.sur', value: 'Nos formats à composer' },
    { $set: { value: 'E-shop' } }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'maison.cta', value: 'Succomber à la gourmandise' },
    { $set: { value: 'Je compose ma pyramide' } }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'maison.cta', value: 'Découvrir les pyramides Macajou' },
    { $set: { value: 'Je compose ma pyramide' } }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'maison.title', value: 'Une gourmandise\nbéninoise' },
    { $set: { value: 'Pyramides\nMacajou' } }
  );
  await SiteContent.findOneAndUpdate(
    {
      key: 'maison.body',
      value:
        'Des créations aux saveurs emblématiques de la Maison, où le croquant de la cajou torréfiée rencontre la douceur des coques moelleuses, à base de produits frais et locaux, pour une parenthèse résolument gourmande.',
    },
    {
      $set: {
        value:
          'Les pyramides Macajou élèvent nos macajoux en une architecture gourmande : composez-les à votre goût, ou confiez la sélection à la créatrice, pour une parenthèse résolument béninoise.',
      },
    }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'hero.over', value: 'Pâtisserie de cajou — Bénin 🇧🇯' },
    { $set: { value: 'Pâtisserie de cajou, Bénin 🇧🇯' } }
  );
  await SiteContent.findOneAndUpdate(
    {
      key: 'footer.copy',
      value: '© 2026 ETS MACAJOU — Macajou Gourmandises. Tous droits réservés.',
    },
    { $set: { value: '© 2026 ETS MACAJOU, Macajou Gourmandises. Tous droits réservés.' } }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'histoire.etape1.lieu', value: 'Monde arabo persan' },
    { $set: { value: 'Monde arabo-persan' } }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'histoire.etape2.lieu', value: 'Sicile, Italie' },
    { $set: { value: 'Sicile · Italie' } }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'histoire.etape3.lieu', value: 'Paris, France' },
    { $set: { value: 'Paris · France' } }
  );
  await SiteContent.findOneAndUpdate(
    { key: 'histoire.etape4.lieu', value: 'Cotonou, Bénin' },
    { $set: { value: 'Cotonou · Bénin' } }
  );
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
