const config = require('../config');

function isConfigured() {
  return Boolean(config.fedapaySecretKey);
}

function getClient() {
  if (!isConfigured()) {
    throw new Error('Paiement en ligne non configuré (FEDAPAY_SECRET_KEY manquante)');
  }
  // Lazy require so the server starts without the package until online pay is used.
  const { FedaPay, Transaction } = require('fedapay');
  FedaPay.setApiKey(config.fedapaySecretKey);
  FedaPay.setEnvironment(config.fedapayEnv === 'live' ? 'live' : 'sandbox');
  return { Transaction };
}

/**
 * Create a FedaPay transaction and return a hosted payment URL.
 * @param {{ order: object, customer: object }} params
 */
async function createPaymentLink({ order, customer }) {
  const { Transaction } = getClient();
  const amount = Math.round(Number(order.total) || 0);
  if (amount < 1) throw new Error('Montant de paiement invalide');

  const callbackUrl = `${config.appUrl.replace(/\/$/, '')}/panier.html?paid=1&order=${encodeURIComponent(order.orderNumber)}`;

  const phoneDigits = String(customer.phone || '').replace(/\D/g, '');
  const phoneNumber = phoneDigits.replace(/^229/, '') || phoneDigits;

  const transaction = await Transaction.create({
    description: `Commande Macajou ${order.orderNumber}`,
    amount,
    currency: { iso: 'XOF' },
    callback_url: callbackUrl,
    customer: {
      firstname: customer.firstName,
      lastname: customer.lastName,
      phone_number: {
        number: phoneNumber,
        country: 'bj',
      },
    },
  });

  const token = await transaction.generateToken();
  const paymentUrl = token?.url || token?.token?.url;
  if (!paymentUrl) {
    throw new Error('Impossible de générer le lien de paiement FedaPay');
  }

  return {
    transactionId: String(transaction.id || transaction._id || ''),
    paymentUrl,
  };
}

async function retrieveTransaction(transactionId) {
  const { Transaction } = getClient();
  return Transaction.retrieve(transactionId);
}

module.exports = {
  isConfigured,
  createPaymentLink,
  retrieveTransaction,
};
