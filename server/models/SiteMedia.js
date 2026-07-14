const mongoose = require('mongoose');

const siteMediaSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    section: { type: String, required: true },
    label: { type: String, required: true },
    kind: { type: String, enum: ['image', 'video'], default: 'image' },
    url: { type: String, default: '' },
    alt: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteMedia', siteMediaSchema);
