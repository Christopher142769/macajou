const mongoose = require('mongoose');

const flavorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    image: { type: String, default: '' },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    badge: { type: String, default: '' },
    shortDescription: { type: String, default: '' },
    description: { type: String, default: '' },
    ingredients: { type: String, default: '' },
    conservation: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: null },
    category: { type: String, required: true, trim: true, default: 'Autres' },
    images: [{ type: String }],
    flavors: [flavorSchema],
    stock: { type: Number, default: 50 },
    inStock: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    shippingNote: {
      type: String,
      default: 'Livraison express en 24h à Cotonou & Calavi',
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
