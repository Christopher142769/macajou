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

async function sendViaResend({ to, subject, html, text }) {
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
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${body.slice(0, 180)}`);
  }
  return true;
}

async function sendViaBrevo({ to, subject, html, text }) {
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
      subject,
      htmlContent: html,
      textContent: text,
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

async function sendViaSmtp({ to, subject, html, text }) {
  const transporter = createSmtpTransporter();
  await transporter.sendMail({
    from: `"Macajou Gourmandises" <${config.smtpUser}>`,
    to,
    subject,
    text,
    html,
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
 * Envoi générique avec bascule entre fournisseurs. Sur Render Free, SMTP est souvent bloqué :
 * préférer RESEND_API_KEY ou BREVO_API_KEY (HTTPS).
 */
async function sendMail({ to, subject, html, text }) {
  const payload = { to, subject, html, text };
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

/** Envoie le code OTP de connexion au dashboard. */
async function sendLoginCode({ to, code }) {
  return sendMail({
    to,
    subject: `${code} ,  Code de connexion Macajou`,
    html: emailHtml(code),
    text: emailText(code),
  });
}

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fcfa = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;

function orderLines(order) {
  return (order.items || []).map((i) => {
    const comp = (i.composition || []).length
      ? (i.composition || []).map((c) => `${c.name} ×${c.quantity}`).join(', ')
      : (i.flavors || []).join(', ');
    return { titre: `${i.name} ×${i.quantity}`, detail: comp, total: Number(i.price || 0) * Number(i.quantity || 1) };
  });
}

function orderEmail(order) {
  const c = order.customer || {};
  const online = order.paymentMethod === 'online';
  const paiement = online
    ? `En ligne (${order.paymentStatus === 'paid' ? 'payé' : 'en attente de paiement'})`
    : 'À la livraison / en espèces';
  const mode = c.fulfillment === 'pickup' ? 'Retrait en boutique' : 'Livraison';
  const lines = orderLines(order);
  const rows = [
    ['Client', `${c.firstName || ''} ${c.lastName || ''}`.trim()],
    ['Téléphone', c.phone],
    ['Ville', c.city],
    [mode, c.address],
    ['Notes', c.notes || '—'],
    ['Paiement', paiement],
  ];
  const html = `
    <div style="font-family:Arial,sans-serif;background:#fbf5e8;padding:24px;color:#1c1611">
      <div style="max-width:560px;margin:auto;background:#fffdf8;border-radius:16px;padding:28px">
        <h1 style="margin:0 0 4px;color:#b5121b;font-size:22px">Nouvelle commande ${esc(order.orderNumber)}</h1>
        <p style="margin:0 0 18px;color:#8a7f6f;font-size:14px">${esc(new Date(order.createdAt || Date.now()).toLocaleString('fr-FR', { timeZone: 'Africa/Porto-Novo' }))}</p>
        <table cellpadding="6" style="font-size:14px;border-collapse:collapse;width:100%">
          ${rows.map(([k, v]) => `<tr><td style="color:#8a7f6f;width:110px;vertical-align:top">${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join('')}
        </table>
        <h2 style="font-size:15px;margin:20px 0 8px">Articles</h2>
        <table cellpadding="6" style="font-size:14px;border-collapse:collapse;width:100%">
          ${lines.map((l) => `<tr><td style="border-bottom:1px solid #eee"><b>${esc(l.titre)}</b>${l.detail ? `<br><span style="color:#8a7f6f;font-size:13px">${esc(l.detail)}</span>` : ''}</td><td style="border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${esc(fcfa(l.total))}</td></tr>`).join('')}
        </table>
        <p style="text-align:right;font-size:18px;margin:16px 0 0"><b>Total : ${esc(fcfa(order.total))}</b></p>
        <p style="margin:18px 0 0;font-size:13px;color:#8a7f6f">Gérez cette commande dans le dashboard : <a href="${esc(config.appUrl)}/dashboard/" style="color:#b5121b">${esc(config.appUrl)}/dashboard/</a></p>
      </div>
    </div>`;
  const text = [
    `Nouvelle commande ${order.orderNumber}`,
    ...rows.map(([k, v]) => `${k} : ${v}`),
    '',
    ...lines.map((l) => `- ${l.titre}${l.detail ? ` (${l.detail})` : ''} : ${fcfa(l.total)}`),
    `Total : ${fcfa(order.total)}`,
  ].join('\n');
  return {
    subject: `Nouvelle commande ${order.orderNumber} · ${fcfa(order.total)} · ${c.city || ''}`.trim(),
    html,
    text,
  };
}

/**
 * Prévient l'équipe (ADMIN_EMAIL + ORDER_NOTIFY_EMAILS / OTP_EXTRA_EMAILS) d'une nouvelle commande.
 * Ne lève jamais d'erreur : une commande ne doit pas échouer à cause d'un e-mail.
 */
async function sendOrderNotification(order) {
  const recipients = config.orderNotifyEmails;
  if (!recipients.length) return;
  const mail = orderEmail(order);
  const results = await Promise.allSettled(recipients.map((to) => sendMail({ to, ...mail })));
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`Email nouvelle commande non envoyé (${recipients[i]}) :`, r.reason?.message);
  });
}

module.exports = { sendLoginCode, sendMail, sendOrderNotification, orderEmail };
