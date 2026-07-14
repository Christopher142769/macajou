const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { customer, items } = req.body;
    if (!customer || !items?.length) {
      return res.status(400).json({ error: 'Client et panier requis' });
    }
    if (!['Cotonou', 'Calavi'].includes(customer.city)) {
      return res.status(400).json({ error: 'Ville invalide (Cotonou ou Calavi)' });
    }

    const resolved = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.active) {
        return res.status(400).json({ error: `Produit indisponible : ${item.name || item.productId}` });
      }
      const qty = Math.max(1, Number(item.quantity) || 1);
      const line = {
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: qty,
        image: product.images?.[0] || '',
      };
      subtotal += line.price * qty;
      resolved.push(line);
    }

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
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    const order = await Order.findById(req.params.id).populate('items.product');
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
