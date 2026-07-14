require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/macajou',
  jwtSecret: process.env.JWT_SECRET || 'macajou-dev-secret',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@macajou.bj',
  adminPassword: process.env.ADMIN_PASSWORD || 'Macajou2026!',
};
