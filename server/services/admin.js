const Admin = require('../models/Admin');
const config = require('../config');

async function ensureDefaultAdmin() {
  const email = config.adminEmail.toLowerCase().trim();
  const passwordHash = await Admin.hashPassword(config.adminPassword);
  const admin = await Admin.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        passwordHash,
        name: 'Admin Macajou',
        otpHash: '',
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return admin;
}

module.exports = { ensureDefaultAdmin };
