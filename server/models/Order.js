const mongoose = require('mongoose');

const compositionItemSchema = new mongoose.Schema(
  {
    macajou: { type: mongoose.Schema.Types.ObjectId, ref: 'Macajou' },
    name: String,
    image: String,
    quantity: { type: Number, min: 1, default: 1 },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    coffret: { type: mongoose.Schema.Types.ObjectId, ref: 'Coffret' },
    name: String,
    price: Number,
    quantity: { type: Number, min: 1, default: 1 },
    image: String,
    capacity: { type: Number, default: 0 },
    composition: { type: [compositionItemSchema], default: [] },
    /** @deprecated legacy flavor names */
    flavors: { type: [String], default: [] },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, index: true },
    customer: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      city: { type: String, enum: ['Cotonou', 'Calavi'], required: true },
      address: { type: String, default: '', trim: true },
      notes: { type: String, default: '' },
      fulfillment: {
        type: String,
        enum: ['delivery', 'pickup'],
        default: 'delivery',
      },
    },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['online', 'cash'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'not_required'],
      default: 'not_required',
    },
    fedapayTransactionId: { type: String, default: '' },
    status: {
      type: String,
      enum: ['reçue', 'confirmée', 'en préparation', 'livrée', 'annulée'],
      default: 'reçue',
    },
  },
  { timestamps: true }
);

orderSchema.pre('validate', function assignOrderNumber(next) {
  if (!this.orderNumber) {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 900 + 100);
    this.orderNumber = `MJ-${stamp}-${rand}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
