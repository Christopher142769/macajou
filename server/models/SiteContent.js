const mongoose = require('mongoose');

const siteContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    section: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: String, default: '' },
    multiline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteContent', siteContentSchema);
