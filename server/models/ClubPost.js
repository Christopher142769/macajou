const mongoose = require('mongoose');

const TYPES = ['event', 'coming_soon', 'news'];

const clubPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: TYPES, default: 'news' },
    excerpt: { type: String, default: '' },
    body: { type: String, default: '' },
    image: { type: String, default: '' },
    eventDate: { type: Date, default: null },
    eventLocation: { type: String, default: '' },
    active: { type: Boolean, default: true },
    showPopup: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClubPost', clubPostSchema);
module.exports.TYPES = TYPES;
