const express = require('express');
const Reservation = require('../models/Reservation');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { customer, type, eventDate, guests, message } = req.body;
    if (!customer?.firstName || !customer?.lastName || !customer?.phone || !customer?.city) {
      return res.status(400).json({ error: 'Informations client incomplètes' });
    }
    if (!eventDate || !message) {
      return res.status(400).json({ error: 'Date et message requis' });
    }
    const reservation = await Reservation.create({
      customer,
      type: type || 'événement',
      eventDate,
      guests: guests || 0,
      message,
    });
    res.status(201).json(reservation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const reservations = await Reservation.find(filter).sort({ createdAt: -1 });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });
    res.json(reservation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
