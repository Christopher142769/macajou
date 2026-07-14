const mongoose = require('mongoose');

const mediaAssetSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true, unique: true, index: true },
    resourceType: { type: String, enum: ['image', 'video'], required: true },
    format: { type: String, default: '' },
    bytes: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    originalName: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MediaAsset', mediaAssetSchema);
