const express = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  HeadingLevel,
  WidthType,
} = require('docx');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Reservation = require('../models/Reservation');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function resolveRange(query) {
  const now = new Date();
  let end = endOfDay(query.end || now);
  let start;
  const period = query.period || '30d';

  if (period === 'custom' && query.start) {
    start = startOfDay(query.start);
  } else if (period === 'today') {
    start = startOfDay(now);
  } else if (period === '7d') {
    start = startOfDay(new Date(now.getTime() - 6 * 86400000));
  } else if (period === '90d') {
    start = startOfDay(new Date(now.getTime() - 89 * 86400000));
  } else if (period === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
  } else if (period === 'all') {
    start = new Date(2020, 0, 1);
  } else {
    start = startOfDay(new Date(now.getTime() - 29 * 86400000));
  }

  if (start > end) [start, end] = [startOfDay(end), endOfDay(start)];
  return { start, end, period };
}

function selectedItems(order, productId) {
  if (!productId || productId === 'all') return order.items || [];
  return (order.items || []).filter((item) => String(item.product || '') === String(productId));
}

function orderRevenue(order, productId) {
  if (!productId || productId === 'all') return Number(order.total) || 0;
  return selectedItems(order, productId).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );
}

function filterByProduct(orders, productId) {
  if (!productId || productId === 'all') return orders;
  return orders.filter((order) => selectedItems(order, productId).length > 0);
}

function pctChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function bucketConfig(start, end) {
  const days = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
  if (days > 180) return { mode: 'month', count: 12 };
  if (days > 45) return { mode: 'week', count: 14 };
  return { mode: 'day', count: Math.min(days, 31) };
}

function bucketKey(date, mode) {
  const d = new Date(date);
  if (mode === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (mode === 'week') {
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

function bucketLabel(key, mode) {
  const d = new Date(`${key}${mode === 'month' ? '-01' : ''}T00:00:00`);
  if (mode === 'month') return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  if (mode === 'week') return `Sem. ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function buildSeries(orders, start, end, productId) {
  const { mode } = bucketConfig(start, end);
  const map = new Map();
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = bucketKey(cursor, mode);
    if (!map.has(key)) map.set(key, { key, label: bucketLabel(key, mode), revenue: 0, orders: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const order of orders) {
    const key = bucketKey(order.createdAt, mode);
    if (!map.has(key)) map.set(key, { key, label: bucketLabel(key, mode), revenue: 0, orders: 0 });
    const point = map.get(key);
    point.revenue += orderRevenue(order, productId);
    point.orders += 1;
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function summarizeProducts(orders, productId) {
  const map = new Map();
  for (const order of orders) {
    for (const item of selectedItems(order, productId)) {
      const key = String(item.product || item.name);
      const row = map.get(key) || { id: key, name: item.name, quantity: 0, revenue: 0 };
      row.quantity += Number(item.quantity) || 0;
      row.revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
      map.set(key, row);
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

async function buildReport(query) {
  const { start, end, period } = resolveRange(query);
  const productId = query.product || 'all';
  const span = end.getTime() - start.getTime() + 1;
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - span + 1);

  const [rawOrders, rawPrevious, reservations, products] = await Promise.all([
    Order.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: 1 }).lean(),
    Order.find({ createdAt: { $gte: previousStart, $lte: previousEnd } }).lean(),
    Reservation.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Product.find().sort({ name: 1 }).select('_id name active').lean(),
  ]);

  const orders = filterByProduct(rawOrders, productId);
  const previous = filterByProduct(rawPrevious, productId);
  const validOrders = orders.filter((o) => o.status !== 'annulée');
  const validPrevious = previous.filter((o) => o.status !== 'annulée');
  const revenue = validOrders.reduce((sum, o) => sum + orderRevenue(o, productId), 0);
  const previousRevenue = validPrevious.reduce((sum, o) => sum + orderRevenue(o, productId), 0);
  const itemsSold = validOrders.reduce(
    (sum, o) => sum + selectedItems(o, productId).reduce((n, i) => n + (Number(i.quantity) || 0), 0),
    0
  );
  const product = products.find((p) => String(p._id) === String(productId));
  const byCity = ['Cotonou', 'Calavi'].map((city) => ({
    city,
    count: orders.filter((o) => o.customer?.city === city).length,
    revenue: orders
      .filter((o) => o.customer?.city === city && o.status !== 'annulée')
      .reduce((sum, o) => sum + orderRevenue(o, productId), 0),
  }));
  const statusList = ['reçue', 'confirmée', 'en préparation', 'livrée', 'annulée'];
  const byStatus = statusList.map((status) => ({
    status,
    count: orders.filter((o) => o.status === status).length,
  }));

  return {
    filters: {
      period,
      start: start.toISOString(),
      end: end.toISOString(),
      productId,
      productName: product?.name || 'Tous les produits',
    },
    metrics: {
      revenue,
      orders: orders.length,
      itemsSold,
      reservations,
      averageBasket: validOrders.length ? Math.round(revenue / validOrders.length) : 0,
      cancelled: orders.filter((o) => o.status === 'annulée').length,
      revenueChange: pctChange(revenue, previousRevenue),
      ordersChange: pctChange(orders.length, previous.length),
    },
    series: buildSeries(validOrders, start, end, productId),
    topProducts: summarizeProducts(validOrders, productId).slice(0, 8),
    byCity,
    byStatus,
    orders,
    products,
  };
}

function money(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
}

function date(value) {
  return new Date(value).toLocaleDateString('fr-FR');
}

function fileStem(report) {
  return `bilan-macajou-${report.filters.start.slice(0, 10)}-${report.filters.end.slice(0, 10)}`;
}

function writePdf(res, report) {
  const doc = new PDFDocument({ size: 'A4', margin: 45 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileStem(report)}.pdf"`);
  doc.pipe(res);
  doc.fillColor('#B5121B').fontSize(24).text('MACAJOU GOURMANDISES');
  doc.fillColor('#1C1611').fontSize(15).text('Bilan d’activité', { continued: false });
  doc.moveDown(0.4).fontSize(10).fillColor('#6E6255');
  doc.text(
    `${date(report.filters.start)} au ${date(report.filters.end)} · ${report.filters.productName}`
  );
  doc.moveDown(1.2);
  const m = report.metrics;
  doc.fillColor('#1C1611').fontSize(12);
  doc.text(`Chiffre d’affaires : ${money(m.revenue)}`);
  doc.text(`Commandes : ${m.orders}`);
  doc.text(`Articles vendus : ${m.itemsSold}`);
  doc.text(`Panier moyen : ${money(m.averageBasket)}`);
  doc.text(`Réservations : ${m.reservations}`);
  doc.moveDown(1.2).fontSize(14).text('Produits');
  doc.moveDown(0.4).fontSize(9);
  for (const p of report.topProducts) {
    doc.text(`${p.name}  ·  ${p.quantity} vendu(s)  ·  ${money(p.revenue)}`);
  }
  doc.moveDown(1.2).fontSize(14).text('Commandes détaillées');
  doc.moveDown(0.4).fontSize(8);
  for (const order of report.orders) {
    if (doc.y > 740) doc.addPage();
    doc.text(
      `${date(order.createdAt)} · ${order.orderNumber} · ${order.customer?.lastName || ''} ${
        order.customer?.firstName || ''
      } · ${order.status} · ${money(orderRevenue(order, report.filters.productId))}`
    );
  }
  doc.end();
}

async function writeExcel(res, report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Macajou Gourmandises';
  const summary = workbook.addWorksheet('Bilan');
  summary.columns = [
    { header: 'Indicateur', key: 'label', width: 28 },
    { header: 'Valeur', key: 'value', width: 24 },
  ];
  summary.addRows([
    { label: 'Période', value: `${date(report.filters.start)} - ${date(report.filters.end)}` },
    { label: 'Produit', value: report.filters.productName },
    { label: "Chiffre d'affaires", value: report.metrics.revenue },
    { label: 'Commandes', value: report.metrics.orders },
    { label: 'Articles vendus', value: report.metrics.itemsSold },
    { label: 'Panier moyen', value: report.metrics.averageBasket },
    { label: 'Réservations', value: report.metrics.reservations },
  ]);
  summary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1611' } };
  summary.getColumn(2).numFmt = '#,##0';

  const products = workbook.addWorksheet('Produits');
  products.columns = [
    { header: 'Produit', key: 'name', width: 38 },
    { header: 'Quantité', key: 'quantity', width: 14 },
    { header: 'CA (FCFA)', key: 'revenue', width: 18 },
  ];
  products.addRows(report.topProducts);
  products.getRow(1).font = { bold: true };

  const orders = workbook.addWorksheet('Commandes');
  orders.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Numéro', key: 'number', width: 20 },
    { header: 'Client', key: 'customer', width: 28 },
    { header: 'Ville', key: 'city', width: 14 },
    { header: 'Statut', key: 'status', width: 18 },
    { header: 'Total (FCFA)', key: 'total', width: 18 },
  ];
  orders.addRows(
    report.orders.map((o) => ({
      date: date(o.createdAt),
      number: o.orderNumber,
      customer: `${o.customer?.lastName || ''} ${o.customer?.firstName || ''}`.trim(),
      city: o.customer?.city || '',
      status: o.status,
      total: orderRevenue(o, report.filters.productId),
    }))
  );
  orders.getRow(1).font = { bold: true };

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${fileStem(report)}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

async function writeWord(res, report) {
  const rows = [
    ['Indicateur', 'Valeur'],
    ["Chiffre d'affaires", money(report.metrics.revenue)],
    ['Commandes', String(report.metrics.orders)],
    ['Articles vendus', String(report.metrics.itemsSold)],
    ['Panier moyen', money(report.metrics.averageBasket)],
    ['Réservations', String(report.metrics.reservations)],
  ].map(
    ([a, b], index) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: a, bold: index === 0 })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: b, bold: index === 0 })] })],
          }),
        ],
      })
  );
  const children = [
    new Paragraph({ text: 'MACAJOU GOURMANDISES', heading: HeadingLevel.TITLE }),
    new Paragraph({ text: "Bilan d'activité", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      text: `${date(report.filters.start)} au ${date(report.filters.end)} · ${
        report.filters.productName
      }`,
    }),
    new Paragraph({ text: '' }),
    new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
    new Paragraph({ text: 'Produits', heading: HeadingLevel.HEADING_1 }),
    ...report.topProducts.map(
      (p) => new Paragraph({ text: `${p.name} — ${p.quantity} vendu(s) — ${money(p.revenue)}` })
    ),
    new Paragraph({ text: 'Commandes détaillées', heading: HeadingLevel.HEADING_1 }),
    ...report.orders.map(
      (o) =>
        new Paragraph({
          text: `${date(o.createdAt)} · ${o.orderNumber} · ${o.customer?.lastName || ''} ${
            o.customer?.firstName || ''
          } · ${o.status} · ${money(orderRevenue(o, report.filters.productId))}`,
        })
    ),
  ];
  const document = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(document);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${fileStem(report)}.docx"`);
  res.send(buffer);
}

router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const report = await buildReport(req.query);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/:format', requireAuth, async (req, res) => {
  try {
    const report = await buildReport(req.query);
    if (req.params.format === 'pdf') return writePdf(res, report);
    if (req.params.format === 'xlsx') return writeExcel(res, report);
    if (req.params.format === 'docx') return writeWord(res, report);
    return res.status(400).json({ error: 'Format non pris en charge' });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

module.exports = router;
