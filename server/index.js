const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const reservationRoutes = require('./routes/reservations');
const uploadRoutes = require('./routes/upload');
const siteMediaRoutes = require('./routes/siteMedia');
const siteContentRoutes = require('./routes/siteContent');
const reportRoutes = require('./routes/reports');
const categoryRoutes = require('./routes/categories');
const mediaRoutes = require('./routes/media');
const coffretRoutes = require('./routes/coffrets');
const macajouRoutes = require('./routes/macajoux');
const clubRoutes = require('./routes/club');
const { ensureDefaultAdmin } = require('./services/admin');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(
  express.static(path.join(__dirname, '../public'), {
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}dashboard${path.sep}`)) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
    },
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/site-media', siteMediaRoutes);
app.use('/api/site-content', siteContentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/coffrets', coffretRoutes);
app.use('/api/macajoux', macajouRoutes);
app.use('/api/club', clubRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/dashboard', (_req, res) => {
  res.redirect('/dashboard/');
});

app.get(['/club', '/club-macajou'], (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/club.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  if (req.path.startsWith('/dashboard')) return next();
  if (path.extname(req.path)) return next();
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

async function afterMongoReady() {
  await ensureDefaultAdmin();
  console.log(`Administrateur synchronisé : ${config.adminEmail}`);
  await siteMediaRoutes.ensureSlots();
  await siteContentRoutes.ensureSlots();
  await categoryRoutes.ensureDefaults();
  await coffretRoutes.ensureDefaults();
  await macajouRoutes.ensureDefaults();
  await clubRoutes.ensureDefaults();
}

let mongoConnecting = false;

async function connectMongo() {
  if (mongoose.connection.readyState === 1 || mongoConnecting) return;
  mongoConnecting = true;
  let attempt = 1;
  while (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 8000,
      });
      console.log('MongoDB connecté');
      await afterMongoReady();
      break;
    } catch (err) {
      console.error(`MongoDB tentative ${attempt} :`, err.message);
      const wait = Math.min(15000, 1500 * attempt);
      await new Promise((r) => setTimeout(r, wait));
      attempt += 1;
    }
  }
  mongoConnecting = false;
}

mongoose.connection.on('disconnected', () => {
  if (mongoConnecting) return;
  console.error('MongoDB déconnecté — reconnexion…');
  connectMongo().catch((err) => console.error(err.message));
});

async function start() {
  const host = process.env.HOST || '0.0.0.0';
  await new Promise((resolve, reject) => {
    const server = app.listen(config.port, host, () => {
      console.log(`Macajou → http://${host}:${config.port}`);
      console.log(`Dashboard → http://${host}:${config.port}/dashboard/`);
      resolve(server);
    });
    server.on('error', reject);
  });

  connectMongo().catch((err) => {
    console.error('MongoDB indisponible :', err.message);
  });
}

start().catch((err) => {
  console.error('Impossible de démarrer :', err);
  process.exit(1);
});
