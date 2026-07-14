const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    quantity: { type: Number, min: 1, default: 1 },
    image: String,
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
      address: { type: String, required: true, trim: true },
      notes: { type: String, default: '' },
    },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
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
