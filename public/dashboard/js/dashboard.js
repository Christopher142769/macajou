const TOKEN_KEY = 'macajou_admin_token';
let token = localStorage.getItem(TOKEN_KEY) || '';
let editingImages = [];
let currentReport = null;
let categories = [];
let galleryAssets = [];
let mediaPickerMode = null;
let mediaPickerSelection = new Set();
let loginChallengeToken = '';

const loginView = document.getElementById('loginView');
const app = document.getElementById('app');
const loginForm = document.getElementById('loginForm');
const codeForm = document.getElementById('codeForm');

function authHeaders(json = true) {
  const h = { Authorization: `Bearer ${token}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function api(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

function showApp() {
  loginView.hidden = true;
  app.hidden = false;
  Promise.all([
    loadCategories(),
    loadGallery(),
    loadProducts(),
    loadMedia(),
    loadOrders(),
    loadReservations(),
    loadAnalytics(),
  ]).catch((ex) => {
    console.error(ex);
    const err = document.getElementById('loginError');
    if (err) err.textContent = ex.message || 'Erreur de chargement';
  });
}

function showLogin() {
  token = '';
  localStorage.removeItem(TOKEN_KEY);
  app.hidden = true;
  loginView.hidden = false;
  loginForm.hidden = false;
  codeForm.hidden = true;
  loginChallengeToken = '';
}

async function handleLogin(e) {
  if (e) e.preventDefault();
  const err = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  err.textContent = '';

  if (!email || !password) {
    err.textContent = 'Email et mot de passe requis.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Connexion…';
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!data.requiresCode || !data.challengeToken) {
      throw new Error('Réponse invalide du serveur');
    }
    loginChallengeToken = data.challengeToken;
    loginForm.hidden = true;
    codeForm.hidden = false;
    if (data.fallbackCode) {
      document.getElementById('codeHelp').textContent =
        `⚠ Envoi email impossible. Code de secours : ${data.fallbackCode}`;
    } else {
      document.getElementById('codeHelp').textContent =
        `Un code à 6 chiffres a été envoyé à ${data.emailHint}.`;
    }
    document.getElementById('loginCode').value = '';
    document.getElementById('loginCode').focus();
  } catch (ex) {
    console.error('Login failed', ex);
    err.textContent = ex.message || 'Connexion impossible';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
}

loginForm.addEventListener('submit', handleLogin);

codeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('loginCode').value.replace(/\D/g, '').slice(0, 6);
  const err = document.getElementById('codeError');
  const btn = document.getElementById('verifyCodeBtn');
  err.textContent = '';
  if (code.length !== 6) {
    err.textContent = 'Saisissez les 6 chiffres du code.';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Vérification…';
  try {
    const data = await api('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeToken: loginChallengeToken, code }),
    });
    if (!data.token) throw new Error('Réponse invalide du serveur');
    token = data.token;
    localStorage.setItem(TOKEN_KEY, token);
    showApp();
  } catch (ex) {
    err.textContent = ex.message || 'Code invalide';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Valider le code';
  }
});

document.getElementById('loginCode').addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
});
document.getElementById('backToLogin').addEventListener('click', showLogin);

document.getElementById('logoutBtn').addEventListener('click', showLogin);

function activateTab(name) {
  const btn = document.querySelector(`.side-nav button[data-tab="${name}"]`);
  const tab = document.getElementById(`tab-${name}`);
  if (!btn || !tab) return;
  document.querySelectorAll('.side-nav button').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  btn.classList.add('active');
  tab.classList.add('active');
  const title = document.getElementById('pageTitle');
  if (title) title.textContent = btn.dataset.title || btn.textContent.trim();
  closeNav();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('.side-nav button').forEach((btn) => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

// Raccourcis "Tout voir" / actions rapides
document.addEventListener('click', (e) => {
  const goto = e.target.closest('[data-goto]');
  if (goto) activateTab(goto.dataset.goto);
});

// Menu mobile
const appEl = document.getElementById('app');
const scrim = document.getElementById('scrim');
function openNav() { appEl.classList.add('nav-open'); if (scrim) scrim.hidden = false; }
function closeNav() { appEl.classList.remove('nav-open'); if (scrim) scrim.hidden = true; }
document.getElementById('menuToggle')?.addEventListener('click', openNav);
scrim?.addEventListener('click', closeNav);

// Date du jour dans la topbar
(function setDate() {
  const el = document.getElementById('pageDate');
  if (el) el.textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
})();

function setStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
function setBadge(id, n) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = n;
  el.hidden = !n;
}

function formatPrice(n) {
  return `${Number(n).toLocaleString('fr-FR')} FCFA`;
}

function formatDate(d) {
  return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function reportParams() {
  const period = document.getElementById('reportPeriod')?.value || '30d';
  const product = document.getElementById('reportProduct')?.value || 'all';
  const params = new URLSearchParams({ period, product });
  if (period === 'custom') {
    const start = document.getElementById('reportStart')?.value;
    const end = document.getElementById('reportEnd')?.value;
    if (start) params.set('start', start);
    if (end) params.set('end', end);
  }
  return params;
}

function renderTrend(statId, value, label) {
  const number = document.getElementById(statId);
  if (!number) return;
  const body = number.closest('.stat-body');
  let trend = body.querySelector('.stat-trend');
  if (!trend) {
    trend = document.createElement('span');
    body.appendChild(trend);
  }
  const up = Number(value) >= 0;
  trend.className = `stat-trend ${up ? 'up' : 'down'}`;
  trend.textContent = `${up ? '↗' : '↘'} ${Math.abs(Number(value) || 0)}% ${label}`;
}

function chartEmpty(root, type, message) {
  if (!root) return;
  root.innerHTML = `<div class="chart-empty"><div class="empty-viz ${type || ''}"></div><p>${escapeHtml(message)}</p></div>`;
}

function renderSparkline(elId, series, key, color = '#B5121B') {
  const root = document.getElementById(elId);
  if (!root) return;
  const values = (series || []).map((p) => Number(p[key]) || 0);
  if (!values.length) {
    root.innerHTML = '';
    return;
  }
  const w = 120;
  const h = 28;
  const pad = 2;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = pad + (values.length === 1 ? (w - pad * 2) / 2 : (i / (values.length - 1)) * (w - pad * 2));
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const last = values.at(-1) || 0;
  const first = values[0] || 0;
  const up = last >= first;
  root.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${pts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" opacity="${values.some((v) => v) ? 1 : .35}"/></svg>`;
  root.style.opacity = values.some((v) => v) ? '1' : '.5';
  root.title = up ? 'Tendance à la hausse' : 'Tendance à la baisse';
}

function renderSalesChart(series) {
  const root = document.getElementById('salesChart');
  if (!root) return;
  const hasData = series?.length && series.some((p) => p.revenue || p.orders);
  if (!hasData) {
    chartEmpty(root, '', 'En attente de vos premières ventes — la courbe apparaîtra ici.');
    return;
  }

  const width = 900;
  const height = 280;
  const pad = { left: 52, right: 48, top: 22, bottom: 38 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxRev = Math.max(...series.map((p) => p.revenue), 1);
  const maxOrd = Math.max(...series.map((p) => p.orders), 1);
  const points = series.map((p, i) => ({
    ...p,
    x: pad.left + (series.length === 1 ? chartW / 2 : (i / (series.length - 1)) * chartW),
    yRev: pad.top + chartH - (p.revenue / maxRev) * chartH,
    yOrd: pad.top + chartH - (p.orders / maxOrd) * chartH,
    y: pad.top + chartH - (p.revenue / maxRev) * chartH,
  }));
  const lineRev = points.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.yRev.toFixed(1)}`).join(' ');
  const lineOrd = points.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.yOrd.toFixed(1)}`).join(' ');
  const area = `${lineRev} L ${points.at(-1).x.toFixed(1)} ${pad.top + chartH} L ${points[0].x} ${pad.top + chartH} Z`;
  const labelStep = Math.max(1, Math.ceil(series.length / 8));
  const grids = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const y = pad.top + chartH - ratio * chartH;
      return `<line class="sales-grid-line" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"/><text class="sales-label" x="${pad.left - 8}" y="${y + 3}" text-anchor="end">${ratio ? Math.round((maxRev * ratio) / 1000) + 'k' : '0'}</text>`;
    })
    .join('');

  root.innerHTML = `
    <svg class="sales-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Évolution des ventes">
      <defs>
        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B5121B" stop-opacity=".22"/><stop offset="1" stop-color="#B5121B" stop-opacity="0"/></linearGradient>
      </defs>
      ${grids}
      <path class="sales-area" d="${area}"/>
      <path class="sales-line-orders" d="${lineOrd}"/>
      <path class="sales-line" d="${lineRev}"/>
      ${points
        .map(
          (p, i) => `<circle class="sales-point" cx="${p.x}" cy="${p.yRev}" r="4" data-point="${i}"/>${
            i % labelStep === 0 || i === points.length - 1
              ? `<text class="sales-label" x="${p.x}" y="${height - 10}" text-anchor="middle">${escapeHtml(p.label)}</text>`
              : ''
          }`
        )
        .join('')}
    </svg>
    <div class="chart-tooltip" id="chartTooltip"></div>`;

  const tooltip = root.querySelector('#chartTooltip');
  root.querySelectorAll('[data-point]').forEach((circle) => {
    circle.addEventListener('mouseenter', () => {
      const p = points[Number(circle.dataset.point)];
      tooltip.innerHTML = `<strong>${escapeHtml(p.label)}</strong><br>${formatPrice(p.revenue)} · ${p.orders} cmd.`;
      tooltip.style.left = `${(p.x / width) * 100}%`;
      tooltip.style.top = `${(p.yRev / height) * 100}%`;
      tooltip.style.opacity = '1';
    });
    circle.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
    });
  });
}

function renderVolumeChart(series) {
  const root = document.getElementById('volumeChart');
  if (!root) return;
  const hasData = series?.length && series.some((p) => p.orders);
  if (!hasData) {
    chartEmpty(root, 'bars', 'Aucune commande sur la période sélectionnée.');
    return;
  }

  const width = 420;
  const height = 240;
  const pad = { left: 36, right: 14, top: 16, bottom: 34 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const max = Math.max(...series.map((p) => p.orders), 1);
  const gap = Math.min(12, chartW / series.length / 4);
  const barW = Math.max(8, (chartW - gap * (series.length + 1)) / series.length);
  const labelStep = Math.max(1, Math.ceil(series.length / 6));

  const bars = series
    .map((p, i) => {
      const h = (p.orders / max) * chartH;
      const x = pad.left + gap + i * (barW + gap);
      const y = pad.top + chartH - h;
      return `<rect class="volume-bar" x="${x}" y="${y}" width="${barW}" height="${h}" data-vol="${i}"/>${
        i % labelStep === 0 || i === series.length - 1
          ? `<text class="volume-label" x="${x + barW / 2}" y="${height - 8}" text-anchor="middle">${escapeHtml(p.label)}</text>`
          : ''
      }`;
    })
    .join('');

  root.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-label="Volume de commandes">
      <defs><linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9A24B"/><stop offset="1" stop-color="#B5121B"/></linearGradient></defs>
      ${[0.25, 0.5, 0.75, 1]
        .map((r) => {
          const y = pad.top + chartH - r * chartH;
          return `<line class="sales-grid-line" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"/>`;
        })
        .join('')}
      ${bars}
    </svg>
    <div class="chart-tooltip" id="volumeTooltip"></div>`;

  const tooltip = root.querySelector('#volumeTooltip');
  root.querySelectorAll('[data-vol]').forEach((bar) => {
    bar.addEventListener('mouseenter', () => {
      const p = series[Number(bar.dataset.vol)];
      const bx = Number(bar.getAttribute('x')) + barW / 2;
      const by = Number(bar.getAttribute('y'));
      tooltip.innerHTML = `<strong>${escapeHtml(p.label)}</strong><br>${p.orders} commande${p.orders > 1 ? 's' : ''}`;
      tooltip.style.left = `${(bx / width) * 100}%`;
      tooltip.style.top = `${(by / height) * 100}%`;
      tooltip.style.opacity = '1';
    });
    bar.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
    });
  });
}

function renderDonut(chartId, legendId, slices, options = {}) {
  const root = document.getElementById(chartId);
  const legend = document.getElementById(legendId);
  if (!root) return;

  const colors = options.colors || ['#B5121B', '#C9A24B', '#6E4118', '#1C1611', '#8a7f6f'];
  const valueKey = options.valueKey || 'value';
  const labelKey = options.labelKey || 'label';
  const data = (slices || []).filter((s) => Number(s[valueKey]) > 0);

  if (!data.length) {
    root.innerHTML = `<div class="chart-empty" style="height:150px"><div class="empty-viz donut"></div></div>`;
    if (legend) legend.innerHTML = `<span class="muted" style="font-size:.78rem">${escapeHtml(options.empty || 'Pas de données')}</span>`;
    return;
  }

  const total = data.reduce((s, d) => s + Number(d[valueKey]), 0);
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 58;
  const stroke = 22;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const arcs = data.map((d, i) => {
    const val = Number(d[valueKey]);
    const pct = val / total;
    const len = pct * circ;
    const dash = `${len} ${circ - len}`;
    const rot = (offset / circ) * 360 - 90;
    offset += len;
    return `<circle class="ring-fill" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[i % colors.length]}" stroke-width="${stroke}" stroke-dasharray="${dash}" stroke-dashoffset="0" transform="rotate(${rot} ${cx} ${cy})"/>`;
  });

  root.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" aria-label="${escapeHtml(options.title || 'Diagramme')}">
      <circle class="ring-track" cx="${cx}" cy="${cy}" r="${r}" stroke-width="${stroke}"/>
      ${arcs.join('')}
    </svg>
    <div class="donut-center"><strong>${total}</strong><span>${escapeHtml(options.center || 'total')}</span></div>`;

  if (legend) {
    legend.innerHTML = data
      .map(
        (d, i) =>
          `<span><i style="background:${colors[i % colors.length]}"></i>${escapeHtml(d[labelKey])} · <strong>${d[valueKey]}</strong></span>`
      )
      .join('');
  }
}

function renderKpiRings(metrics, byStatus, byCity) {
  const root = document.getElementById('kpiRings');
  if (!root) return;

  const total = metrics.orders || 0;
  const delivered = byStatus?.find((s) => s.status === 'livrée')?.count || 0;
  const cancelled = metrics.cancelled || 0;
  const fulfilRate = total ? Math.round((delivered / total) * 100) : 0;
  const cancelRate = total ? Math.round((cancelled / total) * 100) : 0;
  const cotonou = byCity?.find((c) => c.city === 'Cotonou')?.count || 0;
  const calavi = byCity?.find((c) => c.city === 'Calavi')?.count || 0;
  const cityTotal = cotonou + calavi || 1;
  const cotonouPct = Math.round((cotonou / cityTotal) * 100);

  const rings = [
    { label: 'Livrées', value: fulfilRate, display: `${fulfilRate}%`, color: '#298553' },
    { label: 'Panier moyen', value: Math.min(100, Math.round(((metrics.averageBasket || 0) / 50000) * 100)), display: metrics.averageBasket ? formatPrice(metrics.averageBasket) : '—', color: '#B5121B' },
    { label: 'Cotonou', value: cotonouPct, display: `${cotonouPct}%`, color: '#C9A24B' },
    { label: 'Annulations', value: cancelRate, display: `${cancelRate}%`, color: '#82090F' },
  ];

  root.innerHTML = rings
    .map((ring) => {
      const r = 36;
      const circ = 2 * Math.PI * r;
      const dash = `${(ring.value / 100) * circ} ${circ}`;
      return `<div class="kpi-ring">
        <svg viewBox="0 0 88 88" aria-hidden="true">
          <circle class="ring-track" cx="44" cy="44" r="${r}"/>
          <circle class="ring-fill" cx="44" cy="44" r="${r}" stroke="${ring.color}" stroke-dasharray="${dash}" transform="rotate(-90 44 44)"/>
        </svg>
        <strong>${ring.display}</strong>
        <small>${ring.label}</small>
      </div>`;
    })
    .join('');
}

function renderTopProducts(products) {
  const root = document.getElementById('topProductsChart');
  if (!root) return;
  if (!products?.length) {
    chartEmpty(root, 'donut', 'Vos best-sellers s’afficheront dès les premières ventes.');
    return;
  }
  const max = Math.max(...products.map((p) => p.revenue), 1);
  root.className = 'bar-list bar-list-tall';
  root.innerHTML = products
    .slice(0, 6)
    .map(
      (p, i) => `<div class="bar-row" style="animation-delay:${i * 0.06}s">
        <span class="bar-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
        <span class="bar-value">${p.quantity} · ${formatPrice(p.revenue)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(6, (p.revenue / max) * 100)}%;background:linear-gradient(90deg,var(--rouge),var(--gold));opacity:${1 - i * 0.08}"></div></div>
      </div>`
    )
    .join('');
}

function renderRecentOrders(orders) {
  const recent = document.getElementById('recentOrders');
  if (!recent) return;
  const list = (orders || []).slice(0, 6);
  if (!list.length) {
    recent.innerHTML = '<div class="chart-empty" style="min-height:160px"><div class="empty-viz bars"></div><p>Aucune commande récente — elles apparaîtront ici en temps réel.</p></div>';
    return;
  }
  recent.className = 'mini-list mini-list-tall';
  recent.innerHTML = list
    .map(
      (o) => `<div class="mini-row">
        <span class="who">${escapeHtml(o.customer?.lastName)} ${escapeHtml(o.customer?.firstName)}
          <small>${escapeHtml(o.orderNumber)} · ${escapeHtml(o.customer?.city || '—')} · <span class="pill">${escapeHtml(o.status)}</span></small>
        </span>
        <span class="amt">${formatPrice(o.total)}</span>
      </div>`
    )
    .join('');
}

async function loadAnalytics() {
  const apply = document.getElementById('applyReport');
  if (apply) {
    apply.disabled = true;
    apply.textContent = 'Chargement…';
  }
  try {
    const report = await api(`/api/reports/analytics?${reportParams()}`, {
      headers: authHeaders(false),
    });
    currentReport = report;
    setStat('statOrders', report.metrics.orders);
    setStat('statRevenue', formatPrice(report.metrics.revenue));
    setStat('statReservations', report.metrics.reservations);
    setStat('statBasket', report.metrics.averageBasket ? formatPrice(report.metrics.averageBasket) : '—');
    setStat('statItems', report.metrics.itemsSold ?? '—');
    renderTrend('statOrders', report.metrics.ordersChange, 'vs période précédente');
    renderTrend('statRevenue', report.metrics.revenueChange, 'vs période précédente');
    renderSparkline('sparkOrders', report.series, 'orders', '#C9A24B');
    renderSparkline('sparkRevenue', report.series, 'revenue', '#B5121B');
    renderSparkline('sparkProducts', report.series, 'orders', '#6E4118');
    renderSalesChart(report.series);
    renderVolumeChart(report.series);
    renderTopProducts(report.topProducts);
    renderDonut('cityChart', 'cityLegend', (report.byCity || []).map((c) => ({ label: c.city, value: c.count })), {
      title: 'Livraisons par ville',
      center: 'livraisons',
      empty: 'Aucune livraison enregistrée',
      colors: ['#B5121B', '#C9A24B'],
    });
    renderDonut('statusChart', 'statusLegend', (report.byStatus || []).map((s) => ({ label: s.status, value: s.count })), {
      title: 'Statut des commandes',
      center: 'commandes',
      empty: 'Aucune commande sur la période',
      colors: ['#C9A24B', '#B5121B', '#6E4118', '#298553', '#8a7f6f'],
    });
    renderKpiRings(report.metrics, report.byStatus, report.byCity);
    renderRecentOrders(report.orders);
  } finally {
    if (apply) {
      apply.disabled = false;
      apply.textContent = 'Appliquer';
    }
  }
}

document.getElementById('reportPeriod')?.addEventListener('change', (e) => {
  const custom = e.target.value === 'custom';
  document.getElementById('customStartWrap').hidden = !custom;
  document.getElementById('customEndWrap').hidden = !custom;
});
document.getElementById('applyReport')?.addEventListener('click', loadAnalytics);

document.querySelectorAll('[data-export]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const format = btn.dataset.export;
    const previous = btn.textContent;
    btn.disabled = true;
    btn.textContent = '…';
    try {
      const res = await fetch(`/api/reports/export/${format}?${reportParams()}`, {
        headers: authHeaders(false),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Export impossible');
      }
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || `bilan-macajou.${format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = previous;
    }
  });
});

function mediaThumb(url) {
  if (/\/video\/upload\//i.test(url || '') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(url || '')) {
    return `<video src="${escapeHtml(url)}" muted playsinline></video>`;
  }
  return `<img src="${escapeHtml(url || '/uploads/placeholder-coffret12.svg')}" alt="">`;
}

function fillCategorySelect(selected = '') {
  const select = document.getElementById('pCategory');
  if (!select) return;
  const active = categories.filter((category) => category.active);
  select.innerHTML =
    '<option value="">Sélectionner une catégorie</option>' +
    active
      .map(
        (category) =>
          `<option value="${escapeHtml(category.name)}" ${
            category.name === selected ? 'selected' : ''
          }>${escapeHtml(category.name)}</option>`
      )
      .join('');
}

async function loadCategories() {
  categories = await api('/api/categories/admin/all', { headers: authHeaders(false) });
  fillCategorySelect(document.getElementById('pCategory')?.value || '');
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;
  grid.innerHTML =
    categories
      .map(
        (category) => `<article class="category-card">
          <div class="category-icon">${escapeHtml(category.name.slice(0, 2).toUpperCase())}</div>
          <div class="category-info">
            <h3>${escapeHtml(category.name)}</h3>
            <span>${category.active ? 'Visible' : 'Masquée'} · ordre ${category.order}</span>
          </div>
          <div class="category-actions">
            <button type="button" data-edit-category="${category._id}">Modifier</button>
            <button type="button" data-delete-category="${category._id}">Supprimer</button>
          </div>
        </article>`
      )
      .join('') || '<p class="empty-state">Aucune catégorie.</p>';
}

function openCategoryForm(category = null) {
  const form = document.getElementById('categoryForm');
  document.getElementById('categoryId').value = category?._id || '';
  document.getElementById('categoryName').value = category?.name || '';
  document.getElementById('categoryOrder').value = category?.order ?? categories.length;
  document.getElementById('categoryActive').checked = category?.active !== false;
  document.getElementById('categoryError').textContent = '';
  form.hidden = false;
  document.getElementById('categoryName').focus();
}

document.getElementById('newCategoryBtn')?.addEventListener('click', () => openCategoryForm());
document.getElementById('cancelCategory')?.addEventListener('click', () => {
  document.getElementById('categoryForm').hidden = true;
});
document.getElementById('categoryForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('categoryId').value;
  const body = {
    name: document.getElementById('categoryName').value.trim(),
    order: Number(document.getElementById('categoryOrder').value) || 0,
    active: document.getElementById('categoryActive').checked,
  };
  try {
    await api(id ? `/api/categories/${id}` : '/api/categories', {
      method: id ? 'PUT' : 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    e.target.hidden = true;
    await loadCategories();
    await loadProducts();
  } catch (err) {
    document.getElementById('categoryError').textContent = err.message;
  }
});
document.getElementById('categoriesGrid')?.addEventListener('click', async (e) => {
  const edit = e.target.closest('[data-edit-category]');
  const del = e.target.closest('[data-delete-category]');
  if (edit) openCategoryForm(categories.find((category) => category._id === edit.dataset.editCategory));
  if (del && confirm('Supprimer cette catégorie ?')) {
    try {
      await api(`/api/categories/${del.dataset.deleteCategory}`, {
        method: 'DELETE',
        headers: authHeaders(false),
      });
      await loadCategories();
    } catch (err) {
      alert(err.message);
    }
  }
});

function galleryCard(asset, picker = false) {
  const preview =
    asset.resourceType === 'video'
      ? `<video src="${escapeHtml(asset.url)}" muted loop playsinline></video>`
      : `<img src="${escapeHtml(asset.url)}" alt="${escapeHtml(asset.originalName)}" loading="lazy">`;
  return `<article class="gallery-card ${picker ? 'pickable' : ''}" data-asset-id="${asset._id}">
    <div class="gallery-preview">${preview}<span>${asset.resourceType === 'video' ? 'Vidéo' : 'Image'}</span></div>
    <div class="gallery-meta"><strong title="${escapeHtml(asset.originalName)}">${escapeHtml(
      asset.originalName || 'Média'
    )}</strong><small>${Math.max(1, Math.round((asset.bytes || 0) / 1024))} Ko</small></div>
    ${
      picker
        ? '<div class="picker-check">✓</div>'
        : `<button type="button" class="gallery-delete" data-delete-asset="${asset._id}">Supprimer</button>`
    }
  </article>`;
}

function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  const search = (document.getElementById('gallerySearch')?.value || '').toLowerCase();
  const type = document.getElementById('galleryType')?.value || '';
  const filtered = galleryAssets.filter(
    (asset) =>
      (!type || asset.resourceType === type) &&
      (!search || (asset.originalName || '').toLowerCase().includes(search))
  );
  grid.innerHTML =
    filtered.map((asset) => galleryCard(asset)).join('') ||
    '<p class="empty-state">Aucun média dans la galerie.</p>';
}

async function loadGallery() {
  galleryAssets = await api('/api/media', { headers: authHeaders(false) });
  renderGallery();
}

document.getElementById('gallerySearch')?.addEventListener('input', renderGallery);
document.getElementById('galleryType')?.addEventListener('change', renderGallery);
document.getElementById('galleryFiles')?.addEventListener('change', async (e) => {
  if (!e.target.files?.length) return;
  const status = document.getElementById('galleryStatus');
  const fd = new FormData();
  [...e.target.files].forEach((file) => fd.append('files', file));
  status.textContent = `Téléversement de ${e.target.files.length} fichier(s)…`;
  try {
    const response = await fetch('/api/media', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Téléversement impossible');
    status.textContent = `${data.length} média(s) ajouté(s)`;
    await loadGallery();
  } catch (err) {
    status.textContent = err.message;
  } finally {
    e.target.value = '';
  }
});
document.getElementById('galleryGrid')?.addEventListener('click', async (e) => {
  const del = e.target.closest('[data-delete-asset]');
  if (!del || !confirm('Supprimer définitivement ce média de Cloudinary ?')) return;
  try {
    await api(`/api/media/${del.dataset.deleteAsset}`, {
      method: 'DELETE',
      headers: authHeaders(false),
    });
    await loadGallery();
  } catch (err) {
    alert(err.message);
  }
});

function openMediaPicker(mode) {
  mediaPickerMode = mode;
  mediaPickerSelection = new Set();
  const onlyImages = mode === 'product';
  const assets = onlyImages
    ? galleryAssets.filter((asset) => asset.resourceType === 'image')
    : galleryAssets;
  document.getElementById('mediaPickerHint').textContent = onlyImages
    ? 'Sélectionnez une ou plusieurs images pour ce produit.'
    : 'Sélectionnez une image ou une vidéo.';
  document.getElementById('mediaPickerGrid').innerHTML =
    assets.map((asset) => galleryCard(asset, true)).join('') ||
    '<p class="empty-state">La galerie est vide.</p>';
  document.getElementById('mediaPickerDialog').showModal();
}

document.getElementById('pickProductImages')?.addEventListener('click', () => openMediaPicker('product'));
document.getElementById('mediaPickerGrid')?.addEventListener('click', (e) => {
  const card = e.target.closest('[data-asset-id]');
  if (!card) return;
  const id = card.dataset.assetId;
  if (mediaPickerMode !== 'product') mediaPickerSelection.clear();
  if (mediaPickerSelection.has(id)) mediaPickerSelection.delete(id);
  else mediaPickerSelection.add(id);
  card.parentElement.querySelectorAll('.selected').forEach((item) => {
    if (!mediaPickerSelection.has(item.dataset.assetId)) item.classList.remove('selected');
  });
  card.classList.toggle('selected', mediaPickerSelection.has(id));
});

function closeMediaPicker() {
  document.getElementById('mediaPickerDialog').close();
  mediaPickerMode = null;
}
document.getElementById('closeMediaPicker')?.addEventListener('click', closeMediaPicker);
document.getElementById('cancelMediaPicker')?.addEventListener('click', closeMediaPicker);
document.getElementById('confirmMediaPicker')?.addEventListener('click', async () => {
  const selected = galleryAssets.filter((asset) => mediaPickerSelection.has(asset._id));
  if (!selected.length) return;
  if (mediaPickerMode === 'product') {
    editingImages = [...new Set([...editingImages, ...selected.map((asset) => asset.url)])];
    renderPreview();
  } else if (mediaPickerMode?.startsWith('site:')) {
    const key = mediaPickerMode.slice(5);
    const asset = selected[0];
    await api(`/api/site-media/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ url: asset.url, kind: asset.resourceType }),
    });
    await loadMedia();
  }
  closeMediaPicker();
});

async function loadProducts() {
  const products = await api('/api/products/admin/all', { headers: authHeaders(false) });
  const grid = document.getElementById('productsGrid');
  const productFilter = document.getElementById('reportProduct');
  if (productFilter) {
    const selected = productFilter.value;
    productFilter.innerHTML =
      '<option value="all">Tous les produits</option>' +
      products
        .map((p) => `<option value="${p._id}">${escapeHtml(p.name)}</option>`)
        .join('');
    if ([...productFilter.options].some((option) => option.value === selected)) {
      productFilter.value = selected;
    }
  }
  setStat('statProducts', products.filter((p) => p.active).length);
  if (!products.length) {
    grid.innerHTML = '<p class="empty-state">Aucun produit. Cliquez sur « Nouveau produit » pour commencer.</p>';
    return;
  }
  grid.innerHTML = products
    .map(
      (p) => `
    <article class="card">
      ${mediaThumb(p.images?.[0])}
      <div class="body">
        <h3>${escapeHtml(p.name)}</h3>
        <div class="meta">${formatPrice(p.price)} · ${escapeHtml(p.category)} · ${p.active ? 'Actif' : 'Masqué'}</div>
        <div class="actions">
          <button type="button" data-edit="${p._id}">Modifier</button>
          <button type="button" data-del="${p._id}">Supprimer</button>
          <a href="/produit.html?slug=${encodeURIComponent(p.slug)}" target="_blank">Fiche</a>
        </div>
      </div>
    </article>`
    )
    .join('');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.getElementById('productsGrid').addEventListener('click', async (e) => {
  const edit = e.target.closest('[data-edit]');
  const del = e.target.closest('[data-del]');
  if (edit) {
    const products = await api('/api/products/admin/all', { headers: authHeaders(false) });
    const p = products.find((x) => x._id === edit.dataset.edit);
    if (p) openProductDialog(p);
  }
  if (del && confirm('Supprimer ce produit ?')) {
    await api(`/api/products/${del.dataset.del}`, { method: 'DELETE', headers: authHeaders(false) });
    loadProducts();
  }
});

const dialog = document.getElementById('productDialog');
const productForm = document.getElementById('productForm');

function openProductDialog(p = null) {
  document.getElementById('productError').hidden = true;
  document.getElementById('productDialogTitle').textContent = p ? 'Modifier le produit' : 'Nouveau produit';
  document.getElementById('productId').value = p?._id || '';
  document.getElementById('pName').value = p?.name || '';
  document.getElementById('pBadge').value = p?.badge || '';
  document.getElementById('pPrice').value = p?.price ?? '';
  fillCategorySelect(p?.category || '');
  document.getElementById('pShort').value = p?.shortDescription || '';
  document.getElementById('pDesc').value = p?.description || '';
  document.getElementById('pIng').value = p?.ingredients || '';
  document.getElementById('pCons').value = p?.conservation || '';
  renderFlavorsList(p?.flavors || []);
  document.getElementById('pStock').value = p?.stock ?? 50;
  document.getElementById('pActive').checked = p?.active !== false;
  document.getElementById('pFeatured').checked = !!p?.featured;
  document.getElementById('pInStock').checked = p?.inStock !== false;
  document.getElementById('pFiles').value = '';
  editingImages = p?.images ? [...p.images] : [];
  renderPreview();
  dialog.showModal();
}

function flavorRowHtml(name = '', quantity = 1) {
  return `<div class="flavor-row">
    <div class="field"><label>Nom de la saveur</label><input type="text" class="flavor-name" value="${escapeHtml(name)}" placeholder="Ex. Chocolat"></div>
    <div class="field"><label>Quantité</label><input type="number" class="flavor-qty" min="1" value="${Number(quantity) || 1}"></div>
    <button type="button" class="flavor-remove" title="Retirer" aria-label="Retirer la saveur">×</button>
  </div>`;
}

function renderFlavorsList(flavors = []) {
  const list = document.getElementById('flavorsList');
  if (!list) return;
  const rows = flavors.length ? flavors : [{ name: '', quantity: 1 }];
  list.innerHTML = rows.map((f) => flavorRowHtml(f.name || '', f.quantity ?? 1)).join('');
}

function collectFlavors() {
  return [...document.querySelectorAll('#flavorsList .flavor-row')]
    .map((row) => ({
      name: row.querySelector('.flavor-name')?.value.trim() || '',
      quantity: Number(row.querySelector('.flavor-qty')?.value) || 1,
    }))
    .filter((f) => f.name);
}

document.getElementById('addFlavorBtn')?.addEventListener('click', () => {
  const list = document.getElementById('flavorsList');
  if (!list) return;
  list.insertAdjacentHTML('beforeend', flavorRowHtml());
  list.querySelector('.flavor-row:last-child .flavor-name')?.focus();
});

document.getElementById('flavorsList')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.flavor-remove');
  if (!btn) return;
  const row = btn.closest('.flavor-row');
  const list = document.getElementById('flavorsList');
  if (!row || !list) return;
  if (list.children.length <= 1) {
    row.querySelector('.flavor-name').value = '';
    row.querySelector('.flavor-qty').value = '1';
    return;
  }
  row.remove();
});

function renderPreview() {
  const box = document.getElementById('pImagesPreview');
  if (!editingImages.length) {
    box.innerHTML = '<span style="opacity:.6;font-size:.85rem">Aucune photo — ajoutez-en pour la landing &amp; la fiche.</span>';
    return;
  }
  box.innerHTML = editingImages
    .map(
      (src, i) =>
        `<div style="position:relative;display:inline-block">
          <img src="${src}" alt="">
          <button type="button" data-rm-img="${i}" title="Retirer" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;border:none;background:#b5121b;color:#fff;cursor:pointer;font-size:12px;line-height:1">×</button>
        </div>`
    )
    .join('');
}

document.getElementById('pImagesPreview').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-rm-img]');
  if (!btn) return;
  editingImages.splice(Number(btn.dataset.rmImg), 1);
  renderPreview();
});

document.getElementById('newProductBtn').addEventListener('click', () => openProductDialog());
document.getElementById('quickNewProduct')?.addEventListener('click', () => {
  activateTab('products');
  openProductDialog();
});
document.getElementById('cancelProduct')?.addEventListener('click', () => dialog.close());
document.getElementById('cancelProduct2')?.addEventListener('click', () => dialog.close());

productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('productError');
  err.hidden = true;
  try {
    const files = document.getElementById('pFiles').files;
    if (files.length) {
      const fd = new FormData();
      [...files].forEach((f) => fd.append('images', f));
      const up = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error || 'Upload échoué');
      editingImages = [...editingImages, ...upData.urls];
      await loadGallery();
    }

    const flavors = collectFlavors();

    const body = {
      name: document.getElementById('pName').value.trim(),
      badge: document.getElementById('pBadge').value.trim(),
      price: Number(document.getElementById('pPrice').value),
      category: document.getElementById('pCategory').value,
      shortDescription: document.getElementById('pShort').value.trim(),
      description: document.getElementById('pDesc').value.trim(),
      ingredients: document.getElementById('pIng').value.trim(),
      conservation: document.getElementById('pCons').value.trim(),
      flavors,
      images: editingImages,
      stock: Number(document.getElementById('pStock').value) || 0,
      active: document.getElementById('pActive').checked,
      featured: document.getElementById('pFeatured').checked,
      inStock: document.getElementById('pInStock').checked,
    };

    const id = document.getElementById('productId').value;
    if (id) {
      await api(`/api/products/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
    } else {
      await api('/api/products', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    }
    dialog.close();
    loadProducts();
  } catch (ex) {
    err.hidden = false;
    err.textContent = ex.message;
  }
});

async function loadOrders() {
  const orders = await api('/api/orders', { headers: authHeaders(false) });
  const statuses = ['reçue', 'confirmée', 'en préparation', 'livrée', 'annulée'];

  const pending = orders.filter((o) => o.status === 'reçue').length;
  setBadge('badgeOrders', pending);

  document.getElementById('ordersList').innerHTML = `
    <table>
      <thead><tr><th>N°</th><th>Client</th><th>Livraison</th><th>Articles</th><th>Total</th><th>Statut</th><th>Date</th></tr></thead>
      <tbody>
        ${orders
          .map(
            (o) => `
          <tr>
            <td>${escapeHtml(o.orderNumber)}</td>
            <td>${escapeHtml(o.customer.lastName)} ${escapeHtml(o.customer.firstName)}<br><small>${escapeHtml(o.customer.phone)}</small></td>
            <td>${escapeHtml(o.customer.city)}<br><small>${escapeHtml(o.customer.address)}</small></td>
            <td>${o.items.map((i) => `${escapeHtml(i.name)} ×${i.quantity}`).join('<br>')}</td>
            <td>${formatPrice(o.total)}</td>
            <td>
              <select class="status" data-order="${o._id}">
                ${statuses.map((s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </td>
            <td>${formatDate(o.createdAt)}</td>
          </tr>`
          )
          .join('') || '<tr><td colspan="7">Aucune commande</td></tr>'}
      </tbody>
    </table>`;
}

document.getElementById('ordersList').addEventListener('change', async (e) => {
  const sel = e.target.closest('select[data-order]');
  if (!sel) return;
  await api(`/api/orders/${sel.dataset.order}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status: sel.value }),
  });
  loadAnalytics();
});

async function loadReservations() {
  const list = await api('/api/reservations', { headers: authHeaders(false) });
  const statuses = ['nouvelle', 'contactée', 'confirmée', 'terminée', 'annulée'];

  setBadge('badgeReservations', list.filter((r) => r.status === 'nouvelle').length);

  document.getElementById('rsvList').innerHTML = `
    <table>
      <thead><tr><th>N°</th><th>Client</th><th>Type</th><th>Date événement</th><th>Message</th><th>Statut</th></tr></thead>
      <tbody>
        ${list
          .map(
            (r) => `
          <tr>
            <td>${escapeHtml(r.reservationNumber)}</td>
            <td>${escapeHtml(r.customer.lastName)} ${escapeHtml(r.customer.firstName)}<br><small>${escapeHtml(r.customer.phone)} · ${escapeHtml(r.customer.city)}</small></td>
            <td>${escapeHtml(r.type)}</td>
            <td>${new Date(r.eventDate).toLocaleDateString('fr-FR')}</td>
            <td>${escapeHtml(r.message)}</td>
            <td>
              <select class="status" data-rsv="${r._id}">
                ${statuses.map((s) => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </td>
          </tr>`
          )
          .join('') || '<tr><td colspan="6">Aucune réservation</td></tr>'}
      </tbody>
    </table>`;
}

document.getElementById('rsvList').addEventListener('change', async (e) => {
  const sel = e.target.closest('select[data-rsv]');
  if (!sel) return;
  await api(`/api/reservations/${sel.dataset.rsv}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status: sel.value }),
  });
});

const reservationDialog = document.getElementById('reservationDialog');
document.getElementById('newReservationBtn')?.addEventListener('click', () => {
  reservationDialog?.showModal();
});
document.getElementById('closeReservation')?.addEventListener('click', () => {
  reservationDialog?.close();
});
document.getElementById('cancelReservation')?.addEventListener('click', () => {
  reservationDialog?.close();
});

document.getElementById('rsvForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  await api('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: {
        lastName: fd.get('lastName'),
        firstName: fd.get('firstName'),
        phone: fd.get('phone'),
        city: fd.get('city'),
      },
      type: fd.get('type'),
      eventDate: fd.get('eventDate'),
      message: fd.get('message'),
    }),
  });
  e.target.reset();
  reservationDialog?.close();
  await loadReservations();
});

async function loadMedia() {
  const root = document.getElementById('mediaSections');
  const errEl = document.getElementById('mediaError');
  if (!root) return;
  errEl.hidden = true;
  const items = await api('/api/site-media', { headers: authHeaders(false) });
  const bySection = {};
  for (const item of items) {
    (bySection[item.section] ||= []).push(item);
  }
  root.innerHTML = Object.entries(bySection)
    .map(
      ([section, list]) => `
      <div class="media-section">
        <h3>${escapeHtml(section)}</h3>
        <div class="media-grid">
          ${list
            .map((m) => {
              const isVideo =
                m.kind === 'video' ||
                /\/video\/upload\//i.test(m.url || '') ||
                /\.(mp4|webm|mov|m4v|ogv)$/i.test(m.url || '');
              const preview = m.url
                ? isVideo
                  ? `<span class="kind-tag">Vidéo</span><video src="${escapeHtml(m.url)}" muted loop autoplay playsinline></video>`
                  : `<span class="kind-tag">Image</span><img src="${escapeHtml(m.url)}" alt="">`
                : `<span class="empty">Visuel d’origine du site<br>(uploadez une image ou une vidéo)</span>`;
              return `<article class="media-card" data-key="${escapeHtml(m.key)}">
                <div class="thumb">${preview}</div>
                <div class="label">${escapeHtml(m.label)}</div>
                <div class="key">${escapeHtml(m.key)}</div>
                <div class="row">
                  <label class="file-btn">Remplacer
                    <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" data-upload="${escapeHtml(m.key)}">
                  </label>
                  <button type="button" data-pick-site="${escapeHtml(m.key)}">Galerie</button>
                  <button type="button" data-clear="${escapeHtml(m.key)}" ${m.url ? '' : 'disabled'}>Réinitialiser</button>
                </div>
                <div class="status" data-status="${escapeHtml(m.key)}"></div>
              </article>`;
            })
            .join('')}
        </div>
      </div>`
    )
    .join('');
}

document.getElementById('mediaSections').addEventListener('change', async (e) => {
  const input = e.target.closest('input[data-upload]');
  if (!input || !input.files?.[0]) return;
  const key = input.dataset.upload;
  const status = document.querySelector(`[data-status="${key}"]`);
  status.textContent = 'Upload…';
  try {
    const fd = new FormData();
    fd.append('file', input.files[0]);
    const up = await fetch('/api/upload/one', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const upData = await up.json();
    if (!up.ok) throw new Error(upData.error || 'Upload échoué');
    await api(`/api/site-media/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ url: upData.url }),
    });
    status.textContent = 'Enregistré — visible sur le site';
    await loadGallery();
    await loadMedia();
  } catch (ex) {
    status.textContent = ex.message;
  } finally {
    input.value = '';
  }
});

document.getElementById('mediaSections').addEventListener('click', async (e) => {
  const pick = e.target.closest('button[data-pick-site]');
  if (pick) {
    openMediaPicker(`site:${pick.dataset.pickSite}`);
    return;
  }
  const btn = e.target.closest('button[data-clear]');
  if (!btn) return;
  const key = btn.dataset.clear;
  if (!confirm('Revenir à l’image d’origine du site pour cet emplacement ?')) return;
  const status = document.querySelector(`[data-status="${key}"]`);
  try {
    await api(`/api/site-media/${encodeURIComponent(key)}/clear`, {
      method: 'POST',
      headers: authHeaders(false),
    });
    status.textContent = 'Réinitialisé';
    await loadMedia();
  } catch (ex) {
    status.textContent = ex.message;
  }
});

(async () => {
  if (!token) return;
  try {
    await api('/api/auth/me', { headers: authHeaders(false) });
    showApp();
  } catch {
    showLogin();
  }
})();
