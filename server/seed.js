require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config');
const Admin = require('./models/Admin');
const Product = require('./models/Product');
const { ensureSlots } = require('./routes/siteMedia');

const products = [
  {
    name: 'La Tour de Macajoux (pièce montée)',
    slug: 'tour-de-macajoux',
    badge: 'Événements',
    shortDescription: 'Pièce montée spectaculaire pour mariages & réceptions.',
    description:
      'Une tour de macajoux artisanaux, assemblée sur commande pour vos plus beaux moments. Idéale pour mariages, baptêmes et réceptions d’entreprise à Cotonou et Calavi.',
    ingredients: 'Noix de cajou du Bénin, sucre, blancs d’œufs, beurre, arômes naturels.',
    conservation: 'À consommer dans les 48h. Conserver au frais, à l’abri de l’humidité.',
    price: 25000,
    category: 'Coffrets',
    images: ['/uploads/placeholder-tour.svg'],
    flavors: [
      { name: 'Cajou nature', quantity: 12 },
      { name: 'Caramel', quantity: 12 },
      { name: 'Chocolat', quantity: 12 },
    ],
    featured: true,
    stock: 10,
  },
  {
    name: 'Coffret de 12 Macajoux Signature',
    slug: 'coffret-12-macajoux-signature',
    badge: 'Signature',
    shortDescription: 'L’essentiel Macajou en douze bouchées d’exception.',
    description:
      'Douze macajoux signature aux saveurs emblématiques de la Maison. Un coffret parfait pour offrir ou pour se faire plaisir.',
    ingredients: 'Noix de cajou, sucre, blancs d’œufs, chocolat, pistache, rose, citron.',
    conservation: 'À consommer sous 5 jours. Conserver entre 4 et 8 °C.',
    price: 8500,
    category: 'Coffrets',
    images: ['/uploads/placeholder-coffret12.svg'],
    flavors: [
      { name: 'Chocolat', quantity: 2 },
      { name: 'Rose', quantity: 2 },
      { name: 'Pistache', quantity: 2 },
      { name: 'Citron', quantity: 2 },
      { name: 'Caramel', quantity: 2 },
      { name: 'Cajou', quantity: 2 },
    ],
    featured: true,
    stock: 40,
  },
  {
    name: 'Macajoux Rouge Passion x6',
    slug: 'macajoux-rouge-passion-x6',
    badge: 'Édition',
    shortDescription: 'Six macajoux à la passion, robe rouge intense.',
    description:
      'Une édition gourmande à la fruit de la passion, en six pièces. Douceur acidulée et croquant de cajou.',
    ingredients: 'Noix de cajou, sucre, blancs d’œufs, purée de passion, colorant naturel.',
    conservation: 'À consommer sous 4 jours. Conserver au frais.',
    price: 4500,
    category: 'Macajoux',
    images: ['/uploads/placeholder-passion.svg'],
    flavors: [{ name: 'Passion', quantity: 6 }],
    featured: true,
    stock: 60,
  },
  {
    name: 'Croquant Caramel & Fleur de sel',
    slug: 'croquant-caramel-fleur-de-sel',
    badge: 'Croquant',
    shortDescription: 'Cajou caramélisé, fleur de sel, croquant irrésistible.',
    description:
      'Des croquants de cajou enrobés de caramel blond et d’une pointe de fleur de sel. Le goûter parfait.',
    ingredients: 'Noix de cajou, sucre, beurre, fleur de sel.',
    conservation: 'Conserver dans un endroit sec, jusqu’à 3 semaines.',
    price: 2500,
    category: 'Croquants',
    images: ['/uploads/placeholder-croquant.svg'],
    flavors: [{ name: 'Caramel fleur de sel', quantity: 1 }],
    featured: true,
    stock: 80,
  },
  {
    name: 'Coffret Découverte x24',
    slug: 'coffret-decouverte-x24',
    badge: 'Découverte',
    shortDescription: 'Vingt-quatre macajoux pour explorer toute la collection.',
    description:
      'Le grand coffret découverte : 24 macajoux aux saveurs variées pour partager ou savourer sur plusieurs jours.',
    ingredients: 'Noix de cajou, sucre, blancs d’œufs, arômes naturels, chocolat, fruits.',
    conservation: 'À consommer sous 5 jours. Conserver entre 4 et 8 °C.',
    price: 15000,
    category: 'Coffrets',
    images: ['/uploads/placeholder-decouverte.svg'],
    flavors: [
      { name: 'Chocolat', quantity: 4 },
      { name: 'Rose', quantity: 4 },
      { name: 'Pistache', quantity: 4 },
      { name: 'Citron', quantity: 4 },
      { name: 'Caramel', quantity: 4 },
      { name: 'Cajou', quantity: 4 },
    ],
    featured: true,
    stock: 25,
  },
];

function placeholderSvg(title, accent) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FBF5E8"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#g)"/>
  <circle cx="400" cy="420" r="160" fill="#FBF5E8" opacity=".55"/>
  <text x="400" y="780" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="#1C1611">${title}</text>
  <text x="400" y="830" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#82090F">Macajou Gourmandises</text>
</svg>`;
}

async function seed() {
  const fs = require('fs');
  const path = require('path');
  const uploads = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploads)) fs.mkdirSync(uploads, { recursive: true });

  const placeholders = [
    ['placeholder-tour.svg', 'Tour', '#B5121B'],
    ['placeholder-coffret12.svg', 'Coffret 12', '#FFDE8F'],
    ['placeholder-passion.svg', 'Passion', '#B5121B'],
    ['placeholder-croquant.svg', 'Croquant', '#6E4118'],
    ['placeholder-decouverte.svg', 'Découverte x24', '#82090F'],
  ];
  for (const [file, title, accent] of placeholders) {
    fs.writeFileSync(path.join(uploads, file), placeholderSvg(title, accent));
  }

  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connecté');

  let admin = await Admin.findOne({ email: config.adminEmail });
  if (!admin) {
    admin = await Admin.create({
      email: config.adminEmail,
      passwordHash: await Admin.hashPassword(config.adminPassword),
      name: 'Admin Macajou',
    });
    console.log(`Admin créé : ${config.adminEmail}`);
  } else {
    console.log('Admin déjà présent');
  }

  for (const p of products) {
    await Product.findOneAndUpdate({ slug: p.slug }, p, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  console.log(`${products.length} produits synchronisés`);
  await ensureSlots();
  console.log('Emplacements médias du site synchronisés');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
