const nodemailer = require('nodemailer');
const config = require('../config');

function createTransporter() {
  if (!config.smtpUser || !config.smtpAppPassword) {
    throw new Error('SMTP_USER et SMTP_APP_PASSWORD doivent être configurés');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.smtpUser,
      pass: config.smtpAppPassword,
    },
  });
}

async function sendLoginCode({ to, code }) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Macajou Gourmandises" <${config.smtpUser}>`,
    to,
    subject: `${code} — Code de connexion Macajou`,
    text: `Votre code de connexion Macajou est ${code}. Il expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#fbf5e8;padding:32px;color:#1c1611">
        <div style="max-width:520px;margin:auto;background:#fffdf8;border-radius:16px;padding:32px;text-align:center">
          <h1 style="margin:0 0 8px;color:#b5121b">Macajou Gourmandises</h1>
          <p>Votre code de connexion au dashboard est :</p>
          <div style="font-size:36px;letter-spacing:10px;font-weight:700;margin:24px 0">${code}</div>
          <p style="color:#8a7f6f;font-size:14px">Ce code expire dans 10 minutes.</p>
        </div>
      </div>`,
  });
}

module.exports = { sendLoginCode };
