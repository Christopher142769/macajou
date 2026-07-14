require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/macajou',
  jwtSecret: process.env.JWT_SECRET || 'macajou-dev-secret',
  adminEmail: process.env.ADMIN_EMAIL || 'macajou0@gmail.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'Macajou2026!',
  smtpUser: process.env.SMTP_USER || '',
  smtpAppPassword: (process.env.SMTP_APP_PASSWORD || '').replace(/\s+/g, ''),
};
