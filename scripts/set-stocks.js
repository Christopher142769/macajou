/**
 * Met à jour le stock des saveurs de macajoux.
 * Usage : node scripts/set-stocks.js [--dry]   (lit MONGODB_URI dans .env)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const config = require('../server/config');
const Macajou = require('../server/models/Macajou');

const STOCKS = {
  café: 25,
  mangue: 40,
  cacao: 30,
  'patate douce': 15,
  fraise: 15,
  vanille: 15,
  citron: 20,
  menthe: 20,
  toffee: 40,
  bissap: 0,
};

const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

(async () => {
  const dry = process.argv.includes('--dry');
  await mongoose.connect(config.mongoUri);
  const all = await Macajou.find();
  console.log('Saveurs en base :', all.map((m) => `${m.name}(${m.stock ?? '∞'})`).join(', '));
  const keys = Object.keys(STOCKS).map(norm);
  const used = new Set();
  for (const m of all) {
    const key = keys.find((k) => norm(m.name) === k || norm(m.name).startsWith(`${k} `));
    if (!key) continue;
    used.add(key);
    const stock = STOCKS[Object.keys(STOCKS).find((k) => norm(k) === key)];
    console.log(`${dry ? '[dry] ' : ''}${m.name}: ${m.stock ?? '∞'} → ${stock}`);
    if (!dry) {
      m.stock = stock;
      m.available = stock > 0;
      await m.save();
    }
  }
  for (const k of keys.filter((k) => !used.has(k))) console.log(`⚠ Saveur introuvable en base : ${k}`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
