const mongoose = require('mongoose');

const CAPACITIES = [4, 8, 10, 16, 18];

const coffretSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    capacity: {
      type: Number,
      required: true,
      enum: CAPACITIES,
    },
    price: { type: Number, required: true, min: 0 },
    shortDescription: { type: String, default: '' },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    images: [{ type: String }],
    badge: { type: String, default: '' },
    active: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    limitedEdition: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coffret', coffretSchema);
module.exports.CAPACITIES = CAPACITIES;
