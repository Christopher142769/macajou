const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/macajou',
  jwtSecret: process.env.JWT_SECRET || 'macajou-dev-secret',
  adminEmail: process.env.ADMIN_EMAIL || 'macajou0@gmail.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'Macajou2026!',
  /** Adresses qui reçoivent aussi le code de connexion (séparées par des virgules). */
  otpExtraEmails: (process.env.OTP_EXTRA_EMAILS || 'nelly.chabi@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  /** Destinataires des e-mails « nouvelle commande » : ADMIN_EMAIL + ORDER_NOTIFY_EMAILS (ou OTP_EXTRA_EMAILS à défaut). */
  orderNotifyEmails: [
    ...new Set(
      [
        process.env.ADMIN_EMAIL || 'macajou0@gmail.com',
        ...(process.env.ORDER_NOTIFY_EMAILS || process.env.OTP_EXTRA_EMAILS || 'nelly.chabi@gmail.com').split(','),
      ]
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    ),
  ],
  smtpUser: process.env.SMTP_USER || '',
  smtpAppPassword: (process.env.SMTP_APP_PASSWORD || '').replace(/\s+/g, ''),
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFrom: process.env.RESEND_FROM || '',
  brevoApiKey: process.env.BREVO_API_KEY || '',
  appUrl: (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, ''),
  fedapaySecretKey: process.env.FEDAPAY_SECRET_KEY || '',
  fedapayEnv: process.env.FEDAPAY_ENV || 'sandbox',
  fedapayWebhookSecret: process.env.FEDAPAY_WEBHOOK_SECRET || '',
};
