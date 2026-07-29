const SiteSettings = require('../models/SiteSettings');

const SETTINGS_KEY = 'main';

async function getSettings() {
  let doc = await SiteSettings.findOne({ key: SETTINGS_KEY });
  if (!doc) {
    doc = await SiteSettings.create({ key: SETTINGS_KEY, onlinePaymentEnabled: false });
  }
  return doc;
}

async function setOnlinePaymentEnabled(enabled) {
  return SiteSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: { onlinePaymentEnabled: !!enabled }, $setOnInsert: { key: SETTINGS_KEY } },
    { upsert: true, new: true }
  );
}

module.exports = {
  getSettings,
  setOnlinePaymentEnabled,
};
