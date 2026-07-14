const { Readable } = require('stream');
const { v2: cloudinary } = require('cloudinary');
const MediaAsset = require('../models/MediaAsset');

cloudinary.config({ secure: true });

function ensureConfigured() {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error('CLOUDINARY_URL doit être configurée sur le serveur');
  }
}

function uploadBuffer(file) {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'macajou',
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    Readable.from(file.buffer).pipe(stream);
  });
}

async function storeFile(file) {
  const result = await uploadBuffer(file);
  return MediaAsset.create({
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type === 'video' ? 'video' : 'image',
    format: result.format || '',
    bytes: result.bytes || 0,
    width: result.width || 0,
    height: result.height || 0,
    originalName: file.originalname || '',
  });
}

async function destroyAsset(asset) {
  ensureConfigured();
  return cloudinary.uploader.destroy(asset.publicId, {
    resource_type: asset.resourceType,
    invalidate: true,
  });
}

module.exports = { storeFile, destroyAsset };
