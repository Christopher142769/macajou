const nodemailer = require('nodemailer');
const config = require('../config');

const SEND_TIMEOUT_MS = 8000;

function withTimeout(promise, ms, label = 'Envoi email') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} : Connection timeout`)), ms);
    }),
  ]);
}

async function sendViaResend({ to, code }) {
  if (!config.resendApiKey) return false;
  const from = config.resendFrom || 'Macajou Gourmandises <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${code} ,  Code de connexion Macajou`,
      html: emailHtml(code),
      text: emailText(code),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${body.slice(0, 180)}`);
  }
  return true;
}

async function sendViaBrevo({ to, code }) {
  if (!config.brevoApiKey) return false;
  const senderEmail = config.smtpUser || config.adminEmail;
  if (!senderEmail) throw new Error('SMTP_USER (ou ADMIN_EMAIL) requis comme expéditeur Brevo');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': config.brevoApiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Macajou Gourmandises', email: senderEmail },
      to: [{ email: to }],
      subject: `${code} ,  Code de connexion Macajou`,
      htmlContent: emailHtml(code),
      textContent: emailText(code),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo ${res.status}: ${body.slice(0, 180)}`);
  }
  return true;
}

function createSmtpTransporter() {
  if (!config.smtpUser || !config.smtpAppPassword) {
    throw new Error('SMTP_USER et SMTP_APP_PASSWORD doivent être configurés');
  }
  // Timeouts courts : Render Free bloque souvent les ports SMTP (465/587).
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: config.smtpUser,
      pass: config.smtpAppPassword,
    },
    connectionTimeout: SEND_TIMEOUT_MS,
    greetingTimeout: SEND_TIMEOUT_MS,
    socketTimeout: SEND_TIMEOUT_MS,
  });
}

async function sendViaSmtp({ to, code }) {
  const transporter = createSmtpTransporter();
  await transporter.sendMail({
    from: `"Macajou Gourmandises" <${config.smtpUser}>`,
    to,
    subject: `${code} ,  Code de connexion Macajou`,
    text: emailText(code),
    html: emailHtml(code),
  });
  return true;
}

function emailText(code) {
  return `Votre code de connexion Macajou est ${code}. Il expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`;
}

function emailHtml(code) {
  return `
      <div style="font-family:Arial,sans-serif;background:#fbf5e8;padding:32px;color:#1c1611">
        <div style="max-width:520px;margin:auto;background:#fffdf8;border-radius:16px;padding:32px;text-align:center">
          <h1 style="margin:0 0 8px;color:#b5121b">Macajou Gourmandises</h1>
          <p>Votre code de connexion au dashboard est :</p>
          <div style="font-size:36px;letter-spacing:10px;font-weight:700;margin:24px 0">${code}</div>
          <p style="color:#8a7f6f;font-size:14px">Ce code expire dans 10 minutes.</p>
        </div>
      </div>`;
}

/**
 * Envoie le code OTP. Sur Render Free, SMTP est souvent bloqué :
 * préférer RESEND_API_KEY ou BREVO_API_KEY (HTTPS).
 */
async function sendLoginCode({ to, code }) {
  const payload = { to, code };
  const attempts = [];

  if (config.resendApiKey) {
    attempts.push(() => sendViaResend(payload));
  }
  if (config.brevoApiKey) {
    attempts.push(() => sendViaBrevo(payload));
  }
  if (config.smtpUser && config.smtpAppPassword) {
    attempts.push(() => sendViaSmtp(payload));
  }

  if (!attempts.length) {
    throw new Error(
      'Aucun fournisseur email configuré (RESEND_API_KEY, BREVO_API_KEY ou SMTP_USER/SMTP_APP_PASSWORD)'
    );
  }

  let lastError;
  for (const attempt of attempts) {
    try {
      await withTimeout(attempt(), SEND_TIMEOUT_MS);
      return;
    } catch (err) {
      lastError = err;
      console.warn('Tentative email échouée :', err.message);
    }
  }
  throw lastError || new Error('Envoi email impossible');
}

module.exports = { sendLoginCode };
