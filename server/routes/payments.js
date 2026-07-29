const express = require('express');
const Order = require('../models/Order');
const config = require('../config');
const fedapay = require('../services/fedapay');
const { requireAuth } = require('../middleware/auth');
const { getSettings, setOnlinePaymentEnabled } = require('../services/settings');

const router = express.Router();

function extractTransaction(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return (
    payload.entity ||
    payload.transaction ||
    payload.data?.transaction ||
    payload.data?.entity ||
    payload.data ||
    payload
  );
}

function isApproved(tx) {
  const status = String(tx?.status || tx?.transaction_status || '').toLowerCase();
  return ['approved', 'approved_transaction', 'transferred', 'paid'].includes(status);
}

async function markOrderPaid(order, transactionId) {
  if (!order) return null;
  if (order.paymentStatus === 'paid') return order;
  order.paymentStatus = 'paid';
  if (transactionId) order.fedapayTransactionId = String(transactionId);
  if (order.status === 'reçue') order.status = 'confirmée';
  await order.save();
  return order;
}

router.get('/status', async (_req, res) => {
  try {
    const settings = await getSettings();
    const configured = fedapay.isConfigured();
    const enabled = !!settings.onlinePaymentEnabled;
    res.json({
      configured,
      enabled,
      onlineAvailable: configured && enabled,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/settings', requireAuth, async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json({
      onlinePaymentEnabled: !!settings.onlinePaymentEnabled,
      fedapayConfigured: fedapay.isConfigured(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings/online-payment', requireAuth, async (req, res) => {
  try {
    if (typeof req.body.enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled (boolean) requis' });
    }
    if (req.body.enabled && !fedapay.isConfigured()) {
      return res.status(400).json({
        error: 'Impossible d’activer : configurez FEDAPAY_SECRET_KEY (et APP_URL) sur le serveur.',
      });
    }
    const settings = await setOnlinePaymentEnabled(req.body.enabled);
    res.json({
      onlinePaymentEnabled: !!settings.onlinePaymentEnabled,
      fedapayConfigured: fedapay.isConfigured(),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/fedapay/webhook', async (req, res) => {
  try {
    if (config.fedapayWebhookSecret) {
      const headerSecret =
        req.get('x-fedapay-signature') ||
        req.get('x-webhook-secret') ||
        req.get('x-fedapay-secret') ||
        '';
      if (headerSecret && headerSecret !== config.fedapayWebhookSecret) {
        return res.status(401).json({ error: 'Signature webhook invalide' });
      }
    }

    const tx = extractTransaction(req.body);
    const transactionId = tx?.id || tx?.transaction_id || req.body?.id;
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction manquante' });
    }

    let approved = isApproved(tx);
    if (!approved && fedapay.isConfigured()) {
      try {
        const live = await fedapay.retrieveTransaction(transactionId);
        approved = isApproved(live);
      } catch (err) {
        console.warn('FedaPay retrieve:', err.message);
      }
    }

    if (!approved) {
      return res.json({ ok: true, ignored: true });
    }

    let order = await Order.findOne({ fedapayTransactionId: String(transactionId) });
    if (!order) {
      const desc = String(tx?.description || '');
      const match = desc.match(/MJ-[A-Z0-9-]+/i);
      if (match) order = await Order.findOne({ orderNumber: match[0].toUpperCase() });
    }

    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable pour cette transaction' });
    }

    await markOrderPaid(order, transactionId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Webhook FedaPay:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/fedapay/sync/:orderNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });

    if (order.paymentMethod !== 'online') {
      return res.json({
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        status: order.status,
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.json({
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        status: order.status,
      });
    }

    if (order.fedapayTransactionId && fedapay.isConfigured()) {
      try {
        const tx = await fedapay.retrieveTransaction(order.fedapayTransactionId);
        if (isApproved(tx)) {
          await markOrderPaid(order, order.fedapayTransactionId);
        } else if (
          String(tx?.status || '').toLowerCase() === 'canceled' ||
          String(tx?.status || '').toLowerCase() === 'declined'
        ) {
          order.paymentStatus = 'failed';
          await order.save();
        }
      } catch (err) {
        console.warn('FedaPay sync:', err.message);
      }
    }

    res.json({
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      status: order.status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
