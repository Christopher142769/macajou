const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: 'Admin Macajou' },
  },
  { timestamps: true }
);

adminSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

adminSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 10);
};

module.exports = mongoose.model('Admin', adminSchema);
