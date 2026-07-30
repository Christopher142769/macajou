const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coffret = require('../models/Coffret');
const Macajou = require('../models/Macajou');
const { requireAuth } = require('../middleware/auth');
const fedapay = require('../services/fedapay');
const { getSettings } = require('../services/settings');

const router = express.Router();

function normalizeFlavors(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((f) => String(f || '').trim()).filter(Boolean))];
}

async function resolveComposition(raw, capacity) {
  if (!Array.isArray(raw) || !raw.length) {
    throw new Error('Composez votre coffret avec des macajoux');
  }
  const composition = [];
  let totalPieces = 0;

  for (const row of raw) {
    const qty = Math.max(0, Number(row.quantity) || 0);
    if (!qty) continue;
    const macajou = await Macajou.findById(row.macajouId || row.macajou || row.id);
    if (!macajou || !macajou.active) {
      throw new Error(`Macajou indisponible : ${row.name || row.macajouId}`);
    }
    totalPieces += qty;
    composition.push({
      macajou: macajou._id,
      name: macajou.name,
      image: macajou.image || '',
      quantity: qty,
    });
  }

  if (!composition.length) {
    throw new Error('Ajoutez au moins un macajou dans le coffret');
  }
  if (totalPieces > capacity) {
    throw new Error(`Ce coffret ne peut contenir que ${capacity} macajoux (vous en avez ${totalPieces})`);
  }
  if (totalPieces < capacity) {
    throw new Error(`Complétez le coffret : ${totalPieces}/${capacity} macajoux`);
  }
  return composition;
}

router.post('/', async (req, res) => {
  try {
    const { customer, items, paymentMethod: rawMethod } = req.body;
    if (!customer || !items?.length) {
      return res.status(400).json({ error: 'Client et panier requis' });
    }
    if (!['Cotonou', 'Calavi'].includes(customer.city)) {
      return res.status(400).json({ error: 'Ville invalide (Cotonou ou Calavi)' });
    }

    const paymentMethod = rawMethod === 'online' ? 'online' : 'cash';
    if (paymentMethod === 'online') {
      const settings = await getSettings();
      if (!settings.onlinePaymentEnabled) {
        return res.status(403).json({
          error: 'Le paiement en ligne est désactivé. Choisissez le paiement à la livraison.',
        });
      }
      if (!fedapay.isConfigured()) {
        return res.status(503).json({
          error: 'Le paiement en ligne n’est pas encore disponible. Choisissez le paiement à la livraison.',
        });
      }
    }

    const resolved = [];
    let subtotal = 0;

    for (const item of items) {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const coffretId = item.coffretId || (item.type === 'coffret' ? item.productId : null);

      if (coffretId || item.type === 'coffret') {
        const coffret = await Coffret.findById(coffretId || item.productId);
        if (!coffret || !coffret.active) {
          return res.status(400).json({ error: `Coffret indisponible : ${item.name || coffretId}` });
        }
        const composition = await resolveComposition(item.composition || [], coffret.capacity);
        const line = {
          coffret: coffret._id,
          name: coffret.name,
          price: coffret.price,
          quantity: qty,
          image: coffret.image || coffret.images?.[0] || '',
          capacity: coffret.capacity,
          composition,
          flavors: composition.map((c) => `${c.name} ×${c.quantity}`),
        };
        subtotal += line.price * qty;
        resolved.push(line);
        continue;
      }

      const product = await Product.findById(item.productId);
      if (!product || !product.active) {
        return res.status(400).json({ error: `Produit indisponible : ${item.name || item.productId}` });
      }
      const flavors = normalizeFlavors(item.flavors);
      const line = {
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: qty,
        image: product.images?.[0] || '',
        flavors,
        composition: [],
      };
      subtotal += line.price * qty;
      resolved.push(line);
    }

    const paymentStatus = paymentMethod === 'online' ? 'pending' : 'not_required';

    const order = await Order.create({
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        city: customer.city,
        address: customer.address,
        notes: customer.notes || '',
      },
      items: resolved,
      subtotal,
      total: subtotal,
      paymentMethod,
      paymentStatus,
    });

    if (paymentMethod === 'cash') {
      return res.status(201).json({ order, paymentUrl: null });
    }

    try {
      const { transactionId, paymentUrl } = await fedapay.createPaymentLink({
        order,
        customer: order.customer,
      });
      order.fedapayTransactionId = transactionId;
      await order.save();
      return res.status(201).json({ order, paymentUrl });
    } catch (payErr) {
      order.paymentStatus = 'failed';
      await order.save();
      return res.status(502).json({
        error: payErr.message || 'Échec de l’initialisation du paiement en ligne',
        order,
      });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/by-number/:orderNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber }).lean();
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    res.json({
      orderNumber: order.orderNumber,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      createdAt: order.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product')
      .populate('items.coffret')
      .populate('items.composition.macajou');
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
