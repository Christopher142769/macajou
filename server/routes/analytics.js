const express = require('express');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const Order = require('../models/Order');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const TZ_OFFSET_MS = 3600 * 1000; // Bénin : UTC+1, pas d'heure d'été
const DAY = 86400000;
const SOURCE_LABELS = {
  facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', whatsapp: 'WhatsApp', google: 'Google (organique)',
  youtube: 'YouTube', email: 'E-mail', direct: 'Direct', autre: 'Autres sites',
};
const NON_SALE = ['annulée', 'injoignable'];

/* ---------- Période (jours calendaires en heure du Bénin) ---------- */
const localDay = (ms) => new Date(ms + TZ_OFFSET_MS).toISOString().slice(0, 10);
const dayStartMs = (ymd) => Date.parse(`${ymd}T00:00:00.000Z`) - TZ_OFFSET_MS;

function resolveRange(q) {
  const todayStart = dayStartMs(localDay(Date.now()));
  let start;
  let end = todayStart + DAY - 1;
  const period = q.period || '30d';
  if (period === 'custom' && /^\d{4}-\d{2}-\d{2}$/.test(q.start || '')) {
    start = dayStartMs(q.start);
    if (/^\d{4}-\d{2}-\d{2}$/.test(q.end || '')) end = dayStartMs(q.end) + DAY - 1;
  } else if (period === 'today') start = todayStart;
  else if (period === 'yesterday') { start = todayStart - DAY; end = todayStart - 1; }
  else if (period === '7d') start = todayStart - 6 * DAY;
  else if (period === '90d') start = todayStart - 89 * DAY;
  else if (period === 'year') start = dayStartMs(`${localDay(Date.now()).slice(0, 4)}-01-01`);
  else if (period === 'all') start = dayStartMs('2020-01-01');
  else start = todayStart - 29 * DAY;
  if (start > end) [start, end] = [dayStartMs(localDay(end)), dayStartMs(localDay(start)) + DAY - 1];
  return { start: new Date(start), end: new Date(end), period };
}

const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const change = (cur, prev) => (!prev ? (cur ? 100 : 0) : Math.round(((cur - prev) / prev) * 1000) / 10);

/* ---------- Sessions (une ligne par visite) ---------- */
async function loadSessions(start, end) {
  return AnalyticsEvent.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: '$sid',
        vid: { $first: '$vid' },
        t0: { $first: '$createdAt' },
        source: { $first: '$source' },
        medium: { $first: '$medium' },
        campaign: { $first: '$campaign' },
        device: { $first: '$device' },
        landing: { $first: '$landing' },
        pv: { $sum: { $cond: [{ $eq: ['$type', 'pageview'] }, 1, 0] } },
        vi: { $sum: { $cond: [{ $eq: ['$type', 'view_item'] }, 1, 0] } },
        atc: { $sum: { $cond: [{ $eq: ['$type', 'add_to_cart'] }, 1, 0] } },
        bc: { $sum: { $cond: [{ $eq: ['$type', 'begin_checkout'] }, 1, 0] } },
        pur: { $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, 1, 0] } },
        wa: { $sum: { $cond: [{ $eq: ['$type', 'whatsapp_click'] }, 1, 0] } },
      },
    },
  ]);
}

async function loadOrders(start, end) {
  return Order.find({ createdAt: { $gte: start, $lte: end } })
    .select('createdAt status total items attribution customer paymentMethod')
    .lean();
}

const validOrder = (o) => !NON_SALE.includes(o.status);
const orderPieces = (o) =>
  (o.items || []).reduce(
    (n, i) => n + (i.composition || []).reduce((m, c) => m + (c.quantity || 0), 0) * (i.quantity || 1),
    0
  );

function coreKpis(sessions, orders) {
  const visitors = new Set(sessions.map((s) => s.vid));
  const pv = sessions.reduce((n, s) => n + s.pv, 0);
  const bounced = sessions.filter((s) => s.pv <= 1 && !s.vi && !s.atc && !s.bc && !s.wa).length;
  const good = orders.filter(validOrder);
  const revenue = good.reduce((n, o) => n + (o.total || 0), 0);
  return {
    visitors: visitors.size,
    sessions: sessions.length,
    pageviews: pv,
    pagesPerSession: sessions.length ? Math.round((pv / sessions.length) * 10) / 10 : 0,
    bounceRate: pct(bounced, sessions.length),
    orders: orders.length,
    validOrders: good.length,
    revenue,
    avgBasket: good.length ? Math.round(revenue / good.length) : 0,
    conversionRate: pct(orders.length, sessions.length),
    cartRate: pct(sessions.filter((s) => s.atc).length, sessions.length),
  };
}

/* ---------- Vue d'ensemble du trafic ---------- */
async function buildOverview(q) {
  const { start, end, period } = resolveRange(q);
  const span = end.getTime() - start.getTime() + 1;
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - span + 1);
  const sourceFilter = q.source && q.source !== 'all' ? String(q.source) : null;

  const [sessAll, ordersAll, prevSess, prevOrders] = await Promise.all([
    loadSessions(start, end), loadOrders(start, end), loadSessions(prevStart, prevEnd), loadOrders(prevStart, prevEnd),
  ]);
  const byFilter = (s) => !sourceFilter || s.source === sourceFilter;
  const orderSource = (o) => o.attribution?.source || 'direct';
  const sessions = sessAll.filter(byFilter);
  const orders = ordersAll.filter((o) => !sourceFilter || orderSource(o) === sourceFilter);
  const prevS = prevSess.filter(byFilter);
  const prevO = prevOrders.filter((o) => !sourceFilter || orderSource(o) === sourceFilter);

  const kpis = coreKpis(sessions, orders);
  const prev = coreKpis(prevS, prevO);
  const changes = {};
  for (const k of ['visitors', 'sessions', 'pageviews', 'orders', 'revenue']) changes[k] = change(kpis[k], prev[k]);
  changes.conversionRate = Math.round((kpis.conversionRate - prev.conversionRate) * 10) / 10;

  // Nouveaux / récurrents
  const vids = [...new Set(sessions.map((s) => s.vid))];
  const known = vids.length
    ? new Set(await AnalyticsEvent.distinct('vid', { createdAt: { $lt: start }, vid: { $in: vids.slice(0, 30000) } }))
    : new Set();
  const returning = vids.filter((v) => known.has(v)).length;

  // Série journalière
  const daily = new Map();
  for (let t = dayStartMs(localDay(start.getTime())); t <= end.getTime(); t += DAY) {
    daily.set(localDay(t), { date: localDay(t), sessions: 0, visitors: new Set(), pageviews: 0, orders: 0, revenue: 0, atc: 0 });
  }
  for (const s of sessions) {
    const d = daily.get(localDay(new Date(s.t0).getTime()));
    if (!d) continue;
    d.sessions += 1; d.visitors.add(s.vid); d.pageviews += s.pv; if (s.atc) d.atc += 1;
  }
  for (const o of orders) {
    const d = daily.get(localDay(new Date(o.createdAt).getTime()));
    if (!d) continue;
    d.orders += 1; if (validOrder(o)) d.revenue += o.total || 0;
  }
  const series = [...daily.values()].map((d) => ({ ...d, visitors: d.visitors.size }));

  // Sources
  const src = new Map();
  const row = (key) => {
    if (!src.has(key)) src.set(key, { source: key, label: SOURCE_LABELS[key] || key, sessions: 0, visitors: new Set(), carts: 0, checkouts: 0, orders: 0, revenue: 0 });
    return src.get(key);
  };
  for (const s of sessAll.filter(byFilter)) {
    const r = row(s.source || 'direct');
    r.sessions += 1; r.visitors.add(s.vid);
    if (s.atc) r.carts += 1;
    if (s.bc) r.checkouts += 1;
  }
  for (const o of orders) {
    const r = row(orderSource(o));
    r.orders += 1; if (validOrder(o)) r.revenue += o.total || 0;
  }
  const sources = [...src.values()]
    .map((r) => ({ ...r, visitors: r.visitors.size, conversionRate: pct(r.orders, r.sessions), share: pct(r.sessions, kpis.sessions) }))
    .sort((a, b) => b.sessions - a.sessions);

  // Campagnes (UTM)
  const camp = new Map();
  for (const s of sessions) {
    if (!s.campaign) continue;
    const k = `${s.source}|${s.medium}|${s.campaign}`;
    const r = camp.get(k) || { source: s.source, label: SOURCE_LABELS[s.source] || s.source, medium: s.medium, campaign: s.campaign, sessions: 0, carts: 0, orders: 0, revenue: 0 };
    r.sessions += 1; if (s.atc) r.carts += 1;
    camp.set(k, r);
  }
  for (const o of orders) {
    const a = o.attribution || {};
    if (!a.campaign) continue;
    const k = `${a.source}|${a.medium}|${a.campaign}`;
    const r = camp.get(k) || { source: a.source, label: SOURCE_LABELS[a.source] || a.source, medium: a.medium, campaign: a.campaign, sessions: 0, carts: 0, orders: 0, revenue: 0 };
    r.orders += 1; if (validOrder(o)) r.revenue += o.total || 0;
    camp.set(k, r);
  }
  const campaigns = [...camp.values()].map((r) => ({ ...r, conversionRate: pct(r.orders, r.sessions) })).sort((a, b) => b.sessions - a.sessions).slice(0, 30);

  // Entonnoir
  const f = (fn) => sessions.filter(fn).length;
  const funnel = [
    { key: 'sessions', label: 'Visites', value: sessions.length },
    { key: 'view_item', label: 'Ont consulté un coffret', value: f((s) => s.vi > 0) },
    { key: 'add_to_cart', label: 'Ont ajouté au panier', value: f((s) => s.atc > 0) },
    { key: 'begin_checkout', label: 'Ont ouvert le panier / commande', value: f((s) => s.bc > 0) },
    { key: 'purchase', label: 'Ont commandé', value: orders.length },
  ];

  // Appareils, heures
  const devices = ['mobile', 'desktop', 'tablet'].map((d) => ({ device: d, sessions: f((s) => (s.device || 'desktop') === d) }));
  const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const s of sessions) {
    const t = new Date(new Date(s.t0).getTime() + TZ_OFFSET_MS);
    heat[(t.getUTCDay() + 6) % 7][t.getUTCHours()] += 1; // lundi = 0
  }

  // Pages, coffrets
  const evMatch = { createdAt: { $gte: start, $lte: end }, ...(sourceFilter ? { source: sourceFilter } : {}) };
  const [pages, items, landings] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: { ...evMatch, type: 'pageview' } },
      { $group: { _id: '$path', views: { $sum: 1 }, sessions: { $addToSet: '$sid' } } },
      { $project: { views: 1, sessions: { $size: '$sessions' } } },
      { $sort: { views: -1 } }, { $limit: 12 },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { ...evMatch, type: { $in: ['view_item', 'add_to_cart'] }, itemType: 'coffret' } },
      { $group: { _id: { id: '$itemId', type: '$type' }, name: { $last: '$itemName' }, n: { $sum: 1 }, visitors: { $addToSet: '$vid' }, qty: { $sum: '$qty' } } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: { ...evMatch, type: 'pageview' } },
      { $sort: { createdAt: 1 } },
      { $group: { _id: '$sid', landing: { $first: '$path' } } },
      { $group: { _id: '$landing', sessions: { $sum: 1 } } },
      { $sort: { sessions: -1 } }, { $limit: 8 },
    ]),
  ]);

  const coffrets = new Map();
  for (const it of items) {
    const r = coffrets.get(it._id.id) || { id: it._id.id, name: it.name, views: 0, viewers: 0, carts: 0, orders: 0, sold: 0, revenue: 0 };
    if (it._id.type === 'view_item') { r.views = it.n; r.viewers = it.visitors.length; }
    else r.carts = it.n;
    r.name = it.name || r.name;
    coffrets.set(it._id.id, r);
  }
  for (const o of orders.filter(validOrder)) {
    for (const i of o.items || []) {
      const id = String(i.coffret || '');
      if (!id) continue;
      const r = coffrets.get(id) || { id, name: i.name, views: 0, viewers: 0, carts: 0, orders: 0, sold: 0, revenue: 0 };
      r.orders += 1; r.sold += i.quantity || 0; r.revenue += (i.price || 0) * (i.quantity || 0);
      coffrets.set(id, r);
    }
  }
  const topCoffrets = [...coffrets.values()]
    .map((r) => ({ ...r, conversionRate: pct(r.orders, r.viewers) }))
    .sort((a, b) => b.views + b.sold * 5 - (a.views + a.sold * 5))
    .slice(0, 12);

  // Leads
  const leadVisitors = new Set(sessions.filter((s) => s.atc || s.bc || s.wa).map((s) => s.vid));
  const abandoned = sessions.filter((s) => s.atc > 0 && s.pur === 0 && !orders.some((o) => o.attribution?.sid === s._id));
  const leads = {
    leads: leadVisitors.size,
    whatsappClicks: sessions.reduce((n, s) => n + s.wa, 0),
    cartSessions: f((s) => s.atc > 0),
    abandonedCarts: abandoned.length,
    leadToOrder: pct(orders.length, leadVisitors.size),
  };

  return {
    filters: { period, start: start.toISOString(), end: end.toISOString(), source: sourceFilter || 'all' },
    sourceOptions: Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label })),
    kpis: { ...kpis, newVisitors: vids.length - returning, returningVisitors: returning },
    previous: prev,
    changes,
    series,
    sources,
    campaigns,
    funnel,
    devices,
    heatmap: heat,
    topPages: pages.map((p) => ({ path: p._id || '/', views: p.views, sessions: p.sessions })),
    landings: landings.map((l) => ({ path: l._id || '/', sessions: l.sessions })),
    topCoffrets,
    leads,
    hasData: sessAll.length > 0 || ordersAll.length > 0,
  };
}

router.get('/overview', async (req, res) => {
  try {
    res.json(await buildOverview(req.query));
  } catch (err) {
    console.error('Analytics :', err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Ventes détaillées : statut / coffret / saveur ---------- */
async function buildSales(q) {
  const { start, end, period } = resolveRange(q);
  const statuses = String(q.status || '').split(',').map((s) => s.trim()).filter(Boolean);
  const coffretId = q.coffret && q.coffret !== 'all' ? String(q.coffret) : null;
  const macajouId = q.macajou && q.macajou !== 'all' ? String(q.macajou) : null;
  const source = q.source && q.source !== 'all' ? String(q.source) : null;

  let orders = await Order.find({ createdAt: { $gte: start, $lte: end } })
    .select('createdAt status total items attribution customer')
    .lean();
  const statusCounts = {};
  for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

  if (statuses.length) orders = orders.filter((o) => statuses.includes(o.status));
  if (source) orders = orders.filter((o) => (o.attribution?.source || 'direct') === source);
  if (coffretId) orders = orders.filter((o) => (o.items || []).some((i) => String(i.coffret || '') === coffretId));
  if (macajouId) orders = orders.filter((o) => (o.items || []).some((i) => (i.composition || []).some((c) => String(c.macajou || '') === macajouId)));

  const flavors = new Map();
  const formats = new Map();
  const cities = new Map();
  let pieces = 0;
  let coffretsCount = 0;
  let revenue = 0;
  for (const o of orders) {
    cities.set(o.customer?.city || '—', (cities.get(o.customer?.city || '—') || 0) + 1);
    for (const i of o.items || []) {
      const qty = i.quantity || 1;
      if (coffretId && String(i.coffret || '') !== coffretId) continue;
      const key = String(i.coffret || i.name);
      const f = formats.get(key) || { id: key, name: i.name, capacity: i.capacity || 0, qty: 0, orders: 0, revenue: 0 };
      f.qty += qty; f.orders += 1; f.revenue += (i.price || 0) * qty;
      formats.set(key, f);
      coffretsCount += qty;
      revenue += (i.price || 0) * qty;
      for (const c of i.composition || []) {
        const id = String(c.macajou || c.name);
        const fl = flavors.get(id) || { id, name: c.name, qty: 0, orders: new Set() };
        fl.qty += (c.quantity || 0) * qty; fl.orders.add(String(o._id));
        flavors.set(id, fl);
        pieces += (c.quantity || 0) * qty;
      }
    }
  }
  const flavorList = [...flavors.values()].map((f) => ({ ...f, orders: f.orders.size })).sort((a, b) => b.qty - a.qty);
  const selectedFlavor = macajouId ? flavorList.find((f) => f.id === macajouId) || { id: macajouId, name: '', qty: 0, orders: 0 } : null;

  return {
    filters: { period, start: start.toISOString(), end: end.toISOString(), status: statuses, coffret: coffretId || 'all', macajou: macajouId || 'all', source: source || 'all' },
    totals: { orders: orders.length, coffrets: coffretsCount, pieces, revenue, avgBasket: orders.length ? Math.round(revenue / orders.length) : 0 },
    statusCounts,
    formats: [...formats.values()].sort((a, b) => b.qty - a.qty),
    flavors: flavorList,
    cities: [...cities.entries()].map(([city, orders]) => ({ city, orders })),
    selectedFlavor,
    recent: orders.slice(-15).reverse().map((o) => ({
      id: String(o._id), createdAt: o.createdAt, status: o.status, total: o.total,
      customer: `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.trim(), city: o.customer?.city,
      source: o.attribution?.source || 'direct',
    })),
  };
}

router.get('/sales', async (req, res) => {
  try {
    res.json(await buildSales(req.query));
  } catch (err) {
    console.error('Analytics ventes :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.buildOverview = buildOverview;
module.exports.buildSales = buildSales;
