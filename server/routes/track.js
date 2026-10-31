const express = require('express');
const AnalyticsEvent = require('../models/AnalyticsEvent');

const router = express.Router();

const TYPES = new Set(['pageview', 'view_item', 'add_to_cart', 'begin_checkout', 'purchase', 'whatsapp_click', 'lead']);
const SOURCES = new Set(['facebook', 'instagram', 'tiktok', 'whatsapp', 'google', 'youtube', 'email', 'direct', 'autre']);
const BOT = /bot|crawl|spider|slurp|uptime|monitor|facebookexternalhit|preview|headless|lighthouse|curl|wget|python|axios/i;

function clean(v, max = 120) {
  return typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) : '';
}

/** Limite très simple par IP : 120 événements / minute (mémoire du processus). */
const hits = new Map();
function allowed(ip, n) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.t > 60000) { hits.set(ip, { t: now, c: n }); return true; }
  rec.c += n;
  return rec.c <= 120;
}
setInterval(() => { const lim = Date.now() - 120000; for (const [k, v] of hits) if (v.t < lim) hits.delete(k); }, 300000).unref();

function sanitize(raw) {
  if (!raw || !TYPES.has(raw.type)) return null;
  const vid = clean(raw.vid, 40);
  const sid = clean(raw.sid, 40);
  if (!vid || !sid) return null;
  const source = clean(raw.source, 20).toLowerCase();
  const device = clean(raw.device, 10).toLowerCase();
  return {
    vid,
    sid,
    type: raw.type,
    path: clean(raw.path, 160),
    itemType: ['coffret', 'macajou'].includes(raw.itemType) ? raw.itemType : '',
    itemId: clean(raw.itemId, 40),
    itemName: clean(raw.itemName, 120),
    qty: Math.max(0, Math.min(1000, Number(raw.qty) || 0)),
    value: Math.max(0, Math.min(100000000, Number(raw.value) || 0)),
    source: SOURCES.has(source) ? source : 'autre',
    medium: clean(raw.medium, 40).toLowerCase(),
    campaign: clean(raw.campaign, 100),
    content: clean(raw.content, 100),
    referrer: clean(raw.referrer, 80).toLowerCase(),
    landing: clean(raw.landing, 160),
    device: ['mobile', 'tablet', 'desktop'].includes(device) ? device : '',
  };
}

// Reçoit un événement ou un lot d'événements (sendBeacon / fetch keepalive). Toujours 204 : jamais bloquant.
router.post('/', async (req, res) => {
  try {
    if (BOT.test(req.get('user-agent') || '')) return res.status(204).end();
    const list = (Array.isArray(req.body?.events) ? req.body.events : [req.body]).slice(0, 10);
    if (!allowed(req.ip, list.length)) return res.status(204).end();
    const docs = list.map(sanitize).filter(Boolean);
    if (docs.length) await AnalyticsEvent.insertMany(docs, { ordered: false });
  } catch (err) {
    console.error('Suivi :', err.message);
  }
  res.status(204).end();
});

module.exports = router;
module.exports.sanitize = sanitize;
