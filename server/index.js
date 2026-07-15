const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const reservationRoutes = require('./routes/reservations');
const uploadRoutes = require('./routes/upload');
const siteMediaRoutes = require('./routes/siteMedia');
const reportRoutes = require('./routes/reports');
const categoryRoutes = require('./routes/categories');
const mediaRoutes = require('./routes/media');
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
app.use('/api/reservations', reservationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/site-media', siteMediaRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/media', mediaRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/dashboard', (_req, res) => {
  res.redirect('/dashboard/');
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  if (req.path.startsWith('/dashboard')) return next();
  if (path.extname(req.path)) return next();
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

async function start() {
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connecté');
  await ensureDefaultAdmin();
  console.log(`Administrateur synchronisé : ${config.adminEmail}`);
  await siteMediaRoutes.ensureSlots();
  await categoryRoutes.ensureDefaults();
  app.listen(config.port, () => {
    console.log(`Macajou → http://localhost:${config.port}`);
    console.log(`Dashboard → http://localhost:${config.port}/dashboard/`);
  });
}

start().catch((err) => {
  console.error('Impossible de démarrer :', err);
  process.exit(1);
});
