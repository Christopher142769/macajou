/* =========================================================
   Macajou · onglet Analytics du dashboard
   Trafic, sources, entonnoir, coffrets, leads, meilleurs moments, campagnes + ventes détaillées.
   Utilise api(), authHeaders(), formatPrice(), escapeHtml() de dashboard.js.
   ========================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => escapeHtml(String(s ?? ''));
  const num = (n) => Number(n || 0).toLocaleString('fr-FR');
  const SRC_COLORS = {
    facebook: '#1877F2', instagram: '#E1306C', tiktok: '#111111', whatsapp: '#25D366', google: '#EA4335',
    youtube: '#FF0000', email: '#8a7f6f', direct: '#6E4118', autre: '#C9A24B',
  };
  const STATUSES = ['reçue', 'confirmée', 'en préparation', 'livrée', 'annulée', 'injoignable'];
  const statusLabel = (s) => (s === 'injoignable' ? 'Injoignable' : s.charAt(0).toUpperCase() + s.slice(1));
  const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const colorOf = (s) => SRC_COLORS[s] || '#C9A24B';

  let loaded = false;
  let lastSales = null;
  let selectedStatuses = new Set();
  let salesTimer = null;

  /* ---------- Paramètres ---------- */
  function periodParams() {
    const p = new URLSearchParams({ period: $('anPeriod').value });
    if ($('anPeriod').value === 'custom') {
      if ($('anStart').value) p.set('start', $('anStart').value);
      if ($('anEnd').value) p.set('end', $('anEnd').value);
    }
    return p;
  }

  /* ---------- Briques d'interface ---------- */
  function delta(value, suffix = '%', invert = false) {
    if (value === undefined || value === null) return '';
    const good = invert ? value < 0 : value > 0;
    const cls = value === 0 ? 'flat' : good ? 'up' : 'down';
    const arrow = value === 0 ? '•' : value > 0 ? '▲' : '▼';
    return `<span class="an-delta ${cls}" title="Par rapport à la période précédente">${arrow} ${Math.abs(value)}${suffix}</span>`;
  }

  function kpi(label, value, sub, color, change, invert) {
    return `<div class="an-kpi" style="--k:${color || 'var(--rouge)'}">
      <div class="k-lbl">${esc(label)}</div>
      <div class="k-num">${value}${change !== undefined ? delta(change, '%', invert) : ''}</div>
      <div class="k-sub">${sub || '&nbsp;'}</div>
    </div>`;
  }

  function bars(items, { valueKey = 'value', labelKey = 'label', colorKey, fmt = num, sub, empty = 'Pas encore de données.' } = {}) {
    const list = (items || []).filter((i) => Number(i[valueKey]) > 0);
    if (!list.length) return `<p class="an-empty">${esc(empty)}</p>`;
    const max = Math.max(...list.map((i) => Number(i[valueKey])), 1);
    return list
      .map((i) => {
        const c = colorKey ? colorOf(i[colorKey]) : 'var(--rouge)';
        return `<div class="an-bar" style="--c:${c}">
          <div class="nm"><i></i><span title="${esc(i[labelKey])}">${esc(i[labelKey])}</span></div>
          <div class="vl">${fmt(i[valueKey])}${sub ? `<small>${sub(i)}</small>` : ''}</div>
          <div class="tr"><b style="width:${Math.max(2, (Number(i[valueKey]) / max) * 100)}%"></b></div>
        </div>`;
      })
      .join('');
  }

  function table(el, head, rows, empty) {
    if (!rows.length) {
      el.innerHTML = `<tbody><tr><td class="an-empty">${esc(empty || 'Pas encore de données.')}</td></tr></tbody>`;
      return;
    }
    el.innerHTML = `<thead><tr>${head
      .map((h, i) => `<th class="${i > 0 && h.num ? 'num' : ''}">${esc(h.t)}</th>`)
      .join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${head[i].num ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
  }

  const srcCell = (s, label) => `<span class="an-src" style="--c:${colorOf(s)}"><i></i>${esc(label || s)}</span>`;
  const rate = (v) => `${v}%`;

  /* ---------- Graphique : visites + commandes par jour ---------- */
  function renderSeries(series) {
    const root = $('anSeries');
    if (!series.length || !series.some((d) => d.sessions || d.orders)) {
      root.innerHTML = '<p class="an-empty">La courbe apparaîtra dès les premières visites.</p>';
      return;
    }
    const W = 900, H = 270, p = { l: 44, r: 40, t: 18, b: 34 };
    const cw = W - p.l - p.r, ch = H - p.t - p.b;
    const maxS = Math.max(...series.map((d) => d.sessions), 1);
    const maxO = Math.max(...series.map((d) => d.orders), 1);
    const x = (i) => p.l + (series.length === 1 ? cw / 2 : (i / (series.length - 1)) * cw);
    const yS = (v) => p.t + ch - (v / maxS) * ch;
    const yO = (v) => p.t + ch - (v / maxO) * ch;
    const line = series.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yS(d.sessions).toFixed(1)}`).join(' ');
    const area = `${line} L${x(series.length - 1).toFixed(1)},${p.t + ch} L${x(0).toFixed(1)},${p.t + ch} Z`;
    const lineO = series.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yO(d.orders).toFixed(1)}`).join(' ');
    const step = Math.ceil(series.length / 9);
    const label = (d) => new Date(`${d.date}T12:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    const grid = [0, 0.25, 0.5, 0.75, 1]
      .map((f) => {
        const yy = p.t + ch - f * ch;
        return `<line x1="${p.l}" x2="${W - p.r}" y1="${yy}" y2="${yy}" stroke="rgba(28,22,17,.07)"/><text class="ax" x="${p.l - 8}" y="${yy + 3}" text-anchor="end">${Math.round(maxS * f)}</text><text class="ax" x="${W - p.r + 8}" y="${yy + 3}">${Math.round(maxO * f)}</text>`;
      })
      .join('');
    const dots = series
      .map((d, i) => `<circle cx="${x(i).toFixed(1)}" cy="${yS(d.sessions).toFixed(1)}" r="3.2" fill="#B5121B"><title>${label(d)} : ${d.sessions} visites · ${d.visitors} visiteurs · ${d.orders} commande(s) · ${formatPrice(d.revenue)}</title></circle>`)
      .join('');
    root.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visites et commandes par jour">
      <defs><linearGradient id="anGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#B5121B" stop-opacity=".28"/><stop offset="1" stop-color="#B5121B" stop-opacity="0"/></linearGradient></defs>
      ${grid}
      <path d="${area}" fill="url(#anGrad)"/><path d="${line}" fill="none" stroke="#B5121B" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="${lineO}" fill="none" stroke="#C9A24B" stroke-width="2.4" stroke-dasharray="5 4" stroke-linejoin="round"/>
      ${dots}
      ${series.map((d, i) => (i % step === 0 ? `<text class="ax" x="${x(i).toFixed(1)}" y="${H - 10}" text-anchor="middle">${label(d)}</text>` : '')).join('')}
    </svg>`;
  }

  /* ---------- Entonnoir ---------- */
  function renderFunnel(funnel) {
    const root = $('anFunnel');
    const top = funnel[0]?.value || 0;
    if (!top) { root.innerHTML = '<p class="an-empty">Pas encore de visites sur la période.</p>'; return; }
    root.innerHTML = funnel
      .map((f, i) => {
        const w = Math.max(18, (f.value / top) * 100);
        const prev = i ? funnel[i - 1].value : 0;
        const drop = i && prev ? `<div class="drop">${rate(Math.round((f.value / prev) * 1000) / 10)} de l’étape précédente · ${rate(Math.round((f.value / top) * 1000) / 10)} des visites</div>` : '';
        return `<div class="an-step"><div class="bar" style="width:${w}%"><span>${esc(f.label)}</span><strong>${num(f.value)}</strong></div>${drop}</div>`;
      })
      .join('');
  }

  /* ---------- Carte thermique jour × heure ---------- */
  function renderHeatmap(heat) {
    const root = $('anHeatmap');
    let max = 0, best = null;
    heat.forEach((row, d) => row.forEach((v, h) => { if (v > max) { max = v; best = { d, h, v }; } }));
    if (!max) { root.innerHTML = '<p class="an-empty">Les créneaux les plus actifs apparaîtront avec les visites.</p>'; $('anBestSlot').textContent = ''; return; }
    $('anBestSlot').textContent = `Pic d’affluence : ${DAYS[best.d]} à ${best.h} h (${best.v} visite${best.v > 1 ? 's' : ''})`;
    let html = '<div class="an-heat-grid"><span></span>';
    for (let h = 0; h < 24; h++) html += `<span class="hh">${h % 3 === 0 ? h : ''}</span>`;
    heat.forEach((row, d) => {
      html += `<span class="hl">${DAYS[d].slice(0, 3)}</span>`;
      row.forEach((v, h) => {
        const a = v ? (0.12 + (v / max) * 0.88).toFixed(2) : 0.04;
        html += `<span class="c${best.d === d && best.h === h ? ' best' : ''}" style="--a:${a}" title="${DAYS[d]} ${h} h : ${v} visite(s)"></span>`;
      });
    });
    root.innerHTML = html + '</div>';
  }

  /* ---------- Rendu complet de la vue d'ensemble ---------- */
  function render(d) {
    const k = d.kpis, c = d.changes;
    $('anNoData').hidden = d.hasData;
    $('anKpis').innerHTML =
      kpi('Visiteurs uniques', num(k.visitors), `${num(k.newVisitors)} nouveaux · ${num(k.returningVisitors)} récurrents`, '#B5121B', c.visitors) +
      kpi('Visites', num(k.sessions), `${k.pagesPerSession} pages par visite`, '#C9A24B', c.sessions) +
      kpi('Pages vues', num(k.pageviews), `Rebond : ${rate(k.bounceRate)}`, '#6E4118', c.pageviews) +
      kpi('Ajouts au panier', rate(k.cartRate), 'des visites ajoutent un coffret', '#1C1611') +
      kpi('Commandes', num(k.orders), `${num(k.validOrders)} valides (hors annulées / injoignables)`, '#B5121B', c.orders) +
      kpi('Taux de conversion', rate(k.conversionRate), 'commandes ÷ visites', '#1f7a2e', c.conversionRate) +
      kpi('Chiffre d’affaires', formatPrice(k.revenue), 'commandes valides', '#C9A24B', c.revenue) +
      kpi('Panier moyen', formatPrice(k.avgBasket), 'par commande valide', '#6E4118');

    renderSeries(d.series);

    $('anSources').innerHTML = bars(d.sources, {
      valueKey: 'sessions', colorKey: 'source', sub: (s) => `${s.share}%`,
      empty: 'Les sources apparaîtront avec les premières visites.',
    });
    renderFunnel(d.funnel);

    table(
      $('anSourcesTable'),
      [{ t: 'Source' }, { t: 'Visites', num: 1 }, { t: 'Visiteurs', num: 1 }, { t: 'Paniers', num: 1 }, { t: 'Commandes', num: 1 }, { t: 'Conversion', num: 1 }, { t: 'CA', num: 1 }],
      d.sources.map((s) => [
        srcCell(s.source, s.label), num(s.sessions), num(s.visitors), num(s.carts), num(s.orders),
        `<span class="an-pill ${s.conversionRate >= 3 ? 'good' : ''}">${rate(s.conversionRate)}</span>`, formatPrice(s.revenue),
      ]),
      'Pas encore de données par source.'
    );

    table(
      $('anCoffretsTable'),
      [{ t: 'Coffret' }, { t: 'Vues', num: 1 }, { t: 'Visiteurs', num: 1 }, { t: 'Ajouts panier', num: 1 }, { t: 'Vendus', num: 1 }, { t: 'Vue → commande', num: 1 }, { t: 'CA', num: 1 }],
      d.topCoffrets.map((r) => [
        `<strong>${esc(r.name)}</strong>`, num(r.views), num(r.viewers), num(r.carts), num(r.sold),
        `<span class="an-pill ${r.conversionRate >= 5 ? 'good' : r.views > 10 && !r.orders ? 'warn' : ''}">${rate(r.conversionRate)}</span>`, formatPrice(r.revenue),
      ]),
      'Les vues de coffrets apparaîtront dès que des visiteurs ouvriront une fiche.'
    );

    const L = d.leads;
    $('anLeads').innerHTML = [
      [num(L.leads), 'leads (visiteurs avec panier, caisse ou WhatsApp)'],
      [num(L.whatsappClicks), 'clics sur WhatsApp'],
      [num(L.cartSessions), 'visites avec ajout au panier'],
      [num(L.abandonedCarts), 'paniers abandonnés à relancer'],
      [rate(L.leadToOrder), 'des leads ont commandé'],
      [rate(k.bounceRate), 'de rebond (une seule page vue)'],
    ].map(([v, t]) => `<div class="an-lead"><strong>${v}</strong><span>${esc(t)}</span></div>`).join('');

    const devTotal = d.devices.reduce((n, x) => n + x.sessions, 0);
    const devLabels = { mobile: 'Mobile', desktop: 'Ordinateur', tablet: 'Tablette' };
    $('anAudience').innerHTML = `<div id="anDevDonut" class="donut-wrap"></div>
      <div class="an-split">
        ${d.devices.map((x) => `<div class="an-bar" style="--c:${x.device === 'mobile' ? '#B5121B' : x.device === 'desktop' ? '#1C1611' : '#C9A24B'}"><div class="nm"><i></i><span>${devLabels[x.device]}</span></div><div class="vl">${devTotal ? rate(Math.round((x.sessions / devTotal) * 1000) / 10) : '—'}<small>${num(x.sessions)}</small></div></div>`).join('')}
        <div class="an-bar"><div class="nm"><span>Nouveaux visiteurs</span></div><div class="vl">${num(k.newVisitors)}</div></div>
        <div class="an-bar"><div class="nm"><span>Visiteurs récurrents</span></div><div class="vl">${num(k.returningVisitors)}</div></div>
      </div>`;
    renderDonut('anDevDonut', null, d.devices.map((x) => ({ label: devLabels[x.device], value: x.sessions })), { colors: ['#B5121B', '#1C1611', '#C9A24B'], center: 'visites' });

    renderHeatmap(d.heatmap);
    $('anPages').innerHTML = bars(d.topPages.map((p) => ({ label: p.path, value: p.views, s: p.sessions })), { sub: (p) => `${num(p.s)} visites`, empty: 'Aucune page vue pour le moment.' });
    $('anLandings').innerHTML = bars(d.landings.map((p) => ({ label: p.path, value: p.sessions })), { empty: 'Aucune page d’entrée pour le moment.' });

    table(
      $('anCampaignsTable'),
      [{ t: 'Campagne' }, { t: 'Réseau' }, { t: 'Type' }, { t: 'Visites', num: 1 }, { t: 'Paniers', num: 1 }, { t: 'Commandes', num: 1 }, { t: 'Conversion', num: 1 }, { t: 'CA', num: 1 }],
      d.campaigns.map((r) => [`<strong>${esc(r.campaign)}</strong>`, srcCell(r.source, r.label), esc(r.medium || '—'), num(r.sessions), num(r.carts), num(r.orders), rate(r.conversionRate), formatPrice(r.revenue)]),
      'Aucune campagne suivie : créez un lien avec le générateur ci-dessous.'
    );

    $('anUpdated').textContent = `Mis à jour à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  async function loadOverview() {
    const p = periodParams();
    p.set('source', $('anSource').value);
    $('anUpdated').textContent = 'Chargement…';
    try {
      const d = await api(`/api/analytics/overview?${p}`, { headers: authHeaders(false) });
      if (!loaded) fillSourceOptions(d.sourceOptions);
      loaded = true;
      render(d);
    } catch (err) {
      $('anUpdated').textContent = err.message || 'Erreur de chargement';
    }
  }

  function fillSourceOptions(opts) {
    for (const id of ['anSource', 'anSalesSource']) {
      const sel = $(id);
      const keep = sel.value;
      sel.innerHTML = `<option value="all">${id === 'anSource' ? 'Toutes les sources' : 'Toutes'}</option>` + opts.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
      sel.value = keep || 'all';
    }
  }

  /* ---------- Ventes détaillées ---------- */
  function renderChips(counts) {
    const total = Object.values(counts || {}).reduce((n, v) => n + v, 0);
    $('anStatusChips').innerHTML =
      `<button type="button" class="an-chip" data-status="" aria-pressed="${selectedStatuses.size === 0}">Tous<b>${total}</b></button>` +
      STATUSES.map((s) => `<button type="button" class="an-chip" data-status="${esc(s)}" aria-pressed="${selectedStatuses.has(s)}">${statusLabel(s)}<b>${counts?.[s] || 0}</b></button>`).join('');
  }

  function salesParams() {
    const p = periodParams();
    if (selectedStatuses.size) p.set('status', [...selectedStatuses].join(','));
    p.set('coffret', $('anCoffret').value);
    p.set('macajou', $('anMacajou').value);
    p.set('source', $('anSalesSource').value);
    return p;
  }

  async function loadSales() {
    try {
      const d = await api(`/api/analytics/sales?${salesParams()}`, { headers: authHeaders(false) });
      lastSales = d;
      renderChips(d.statusCounts);
      const t = d.totals;
      $('anSalesKpis').innerHTML =
        kpi('Commandes', num(t.orders), 'selon vos filtres', '#B5121B') +
        kpi('Coffrets', num(t.coffrets), 'coffrets / pyramides commandés', '#C9A24B') +
        kpi('Macarons', num(t.pieces), 'pièces au total', '#6E4118') +
        kpi('Chiffre d’affaires', formatPrice(t.revenue), `Panier moyen ${formatPrice(t.avgBasket)}`, '#1f7a2e');

      const sf = $('anSalesFlavor');
      if (d.selectedFlavor) {
        const name = $('anMacajou').selectedOptions[0]?.textContent || 'Cette saveur';
        sf.hidden = false;
        sf.innerHTML = `<strong>${esc(name)}</strong> : <strong>${num(d.selectedFlavor.qty)}</strong> pièce${d.selectedFlavor.qty > 1 ? 's' : ''} commandée${d.selectedFlavor.qty > 1 ? 's' : ''} dans ${num(d.selectedFlavor.orders)} commande${d.selectedFlavor.orders > 1 ? 's' : ''}${selectedStatuses.size ? ` (statut : ${[...selectedStatuses].map(statusLabel).join(', ')})` : ''}.`;
      } else sf.hidden = true;

      $('anFlavors').innerHTML = bars(d.flavors, { valueKey: 'qty', sub: (f) => `${num(f.orders)} cmd`, empty: 'Aucune saveur commandée avec ces filtres.' });
      $('anFormats').innerHTML = bars(d.formats.map((f) => ({ ...f, label: f.name })), { valueKey: 'qty', sub: (f) => formatPrice(f.revenue), empty: 'Aucun coffret commandé avec ces filtres.' });
      table(
        $('anSalesTable'),
        [{ t: 'Date' }, { t: 'Client' }, { t: 'Ville' }, { t: 'Source' }, { t: 'Statut' }, { t: 'Total', num: 1 }],
        d.recent.map((o) => [new Date(o.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }), esc(o.customer), esc(o.city || '—'), srcCell(o.source), `<span class="an-pill">${esc(statusLabel(o.status))}</span>`, formatPrice(o.total)]),
        'Aucune commande avec ces filtres.'
      );
    } catch (err) {
      $('anSalesKpis').innerHTML = `<p class="an-empty">${esc(err.message || 'Erreur')}</p>`;
    }
  }

  const queueSales = () => { clearTimeout(salesTimer); salesTimer = setTimeout(loadSales, 200); };

  async function fillCatalogFilters() {
    try {
      const [coffrets, macajoux] = await Promise.all([
        api('/api/coffrets/admin/all', { headers: authHeaders(false) }),
        api('/api/macajoux/admin/all', { headers: authHeaders(false) }),
      ]);
      $('anCoffret').innerHTML = '<option value="all">Tous les coffrets</option>' + coffrets.map((c) => `<option value="${esc(c._id)}">${esc(c.name)} (${c.capacity})</option>`).join('');
      $('anMacajou').innerHTML = '<option value="all">Toutes les saveurs</option>' + macajoux.map((m) => `<option value="${esc(m._id)}">${esc(m.name)}</option>`).join('');
    } catch (_) { /* filtres facultatifs */ }
  }

  function exportCsv() {
    if (!lastSales) return;
    const rows = [['Type', 'Nom', 'Quantité', 'Commandes', 'CA (FCFA)']];
    lastSales.formats.forEach((f) => rows.push(['Coffret', f.name, f.qty, f.orders, f.revenue]));
    lastSales.flavors.forEach((f) => rows.push(['Saveur (pièces)', f.name, f.qty, f.orders, '']));
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `ventes-macajou-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ---------- Générateur de liens ---------- */
  function slug(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function buildUtm() {
    const page = $('utmPage').value;
    const [pathPart, hash = ''] = page.split('#');
    const u = new URL(pathPart || '/', location.origin);
    u.searchParams.set('utm_source', $('utmSource').value);
    u.searchParams.set('utm_medium', $('utmMedium').value);
    const camp = slug($('utmCampaign').value);
    if (camp) u.searchParams.set('utm_campaign', camp);
    const cont = slug($('utmContent').value);
    if (cont) u.searchParams.set('utm_content', cont);
    $('utmOut').value = u.toString() + (hash ? `#${hash}` : '');
  }

  /* ---------- Événements ---------- */
  function init() {
    if (!$('tab-analytics')) return;
    $('anPeriod').addEventListener('change', () => {
      const custom = $('anPeriod').value === 'custom';
      $('anStartWrap').hidden = !custom;
      $('anEndWrap').hidden = !custom;
    });
    $('anApply').addEventListener('click', () => { loadOverview(); loadSales(); });
    ['anCoffret', 'anMacajou', 'anSalesSource'].forEach((id) => $(id).addEventListener('change', queueSales));
    $('anStatusChips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-status]');
      if (!b) return;
      const s = b.dataset.status;
      if (!s) selectedStatuses.clear();
      else if (selectedStatuses.has(s)) selectedStatuses.delete(s);
      else selectedStatuses.add(s);
      renderChips(lastSales?.statusCounts);
      queueSales();
    });
    $('anCsv').addEventListener('click', exportCsv);
    ['utmPage', 'utmSource', 'utmMedium', 'utmCampaign', 'utmContent'].forEach((id) => $(id).addEventListener('input', buildUtm));
    $('utmCopy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('utmOut').value); } catch { $('utmOut').select(); document.execCommand('copy'); }
      $('utmCopy').textContent = 'Lien copié ✓';
      setTimeout(() => { $('utmCopy').textContent = 'Copier le lien'; }, 1800);
    });
    buildUtm();

    let first = true;
    const open = () => {
      if (first) { first = false; fillCatalogFilters().then(loadSales); loadOverview(); }
    };
    document.querySelector('.side-nav button[data-tab="analytics"]')?.addEventListener('click', open);
    new MutationObserver(() => { if ($('tab-analytics').classList.contains('active')) open(); }).observe($('tab-analytics'), { attributes: true, attributeFilter: ['class'] });
  }

  init();
})();
