const mongoose = require('mongoose');

/** Événement de suivi (visites, vues de coffret, ajouts au panier, achats…). Conservé 400 jours. */
const analyticsEventSchema = new mongoose.Schema(
  {
    vid: { type: String, index: true }, // visiteur (navigateur)
    sid: { type: String, index: true }, // session (30 min d'inactivité)
    type: {
      type: String,
      enum: ['pageview', 'view_item', 'add_to_cart', 'begin_checkout', 'purchase', 'whatsapp_click', 'lead'],
      required: true,
    },
    path: { type: String, default: '' },
    itemType: { type: String, default: '' }, // coffret | macajou
    itemId: { type: String, default: '' },
    itemName: { type: String, default: '' },
    qty: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
    source: { type: String, default: 'direct' }, // facebook | instagram | tiktok | whatsapp | google | youtube | email | direct | autre
    medium: { type: String, default: '' },
    campaign: { type: String, default: '' },
    content: { type: String, default: '' },
    referrer: { type: String, default: '' }, // hôte d'origine
    landing: { type: String, default: '' }, // page d'entrée de la session
    device: { type: String, default: '' }, // mobile | tablet | desktop
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 400 },
  },
  { versionKey: false }
);

analyticsEventSchema.index({ createdAt: 1, type: 1 });
analyticsEventSchema.index({ type: 1, itemId: 1, createdAt: 1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
