const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    reservationNumber: { type: String, unique: true, index: true },
    customer: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, default: '' },
      city: { type: String, enum: ['Cotonou', 'Calavi'], required: true },
    },
    type: {
      type: String,
      enum: ['événement', 'entreprise', 'mariage', 'autre'],
      default: 'événement',
    },
    eventDate: { type: Date, required: true },
    guests: { type: Number, default: 0 },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['nouvelle', 'contactée', 'confirmée', 'terminée', 'annulée'],
      default: 'nouvelle',
    },
  },
  { timestamps: true }
);

reservationSchema.pre('validate', function assignNumber(next) {
  if (!this.reservationNumber) {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 900 + 100);
    this.reservationNumber = `RSV-${stamp}-${rand}`;
  }
  next();
});

module.exports = mongoose.model('Reservation', reservationSchema);
