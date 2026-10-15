const mongoose = require('mongoose');

const macajouSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true },
    available: { type: Boolean, default: true },
    /** Quantité disponible ; null = illimité. */
    stock: { type: Number, min: 0, default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Macajou', macajouSchema);
