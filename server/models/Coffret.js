const mongoose = require('mongoose');

/** Valeurs suggérées (seed / API legacy) — la capacité réelle est libre. */
const CAPACITIES = [4, 8, 10, 16, 18];
const KINDS = ['coffret', 'pyramide'];
const CAPACITY_MIN = 1;
const CAPACITY_MAX = 99;

const coffretSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    kind: {
      type: String,
      enum: KINDS,
      default: 'coffret',
      index: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: CAPACITY_MIN,
      max: CAPACITY_MAX,
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
module.exports.KINDS = KINDS;
module.exports.CAPACITY_MIN = CAPACITY_MIN;
module.exports.CAPACITY_MAX = CAPACITY_MAX;
