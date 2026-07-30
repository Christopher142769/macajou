/** Composition stricte d’un coffret avec macajoux */
(function () {
  const params = new URLSearchParams(location.search);
  let slug = params.get('slug') || '';
  const state = document.getElementById('state');
  const root = document.getElementById('compose');

  let coffrets = [];
  let macajoux = [];
  let coffret = null;
  /** @type {Record<string, number>} */
  let qtyById = {};

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function formatPrice(n) {
    return window.Cart ? window.Cart.formatPrice(n) : `${Number(n).toLocaleString('fr-FR')} FCFA`;
  }

  function totalPieces() {
    return Object.values(qtyById).reduce((n, q) => n + (Number(q) || 0), 0);
  }

  function remaining() {
    return (coffret?.capacity || 0) - totalPieces();
  }

  function composition() {
    return macajoux
      .map((m) => ({
        macajouId: m._id,
        name: m.name,
        image: m.image || '',
        quantity: qtyById[m._id] || 0,
      }))
      .filter((c) => c.quantity > 0);
  }

  async function loadData() {
    const [cRes, mRes] = await Promise.all([fetch('/api/coffrets'), fetch('/api/macajoux')]);
    if (!cRes.ok) throw new Error('Impossible de charger les coffrets');
    if (!mRes.ok) throw new Error('Impossible de charger les macajoux');
    coffrets = await cRes.json();
    macajoux = await mRes.json();
    if (!coffrets.length) throw new Error('Aucun coffret disponible');
    if (!macajoux.length) throw new Error('Aucun macajou disponible — ajoutez-en depuis le dashboard');
  }

  function pickCoffret() {
    if (slug) coffret = coffrets.find((c) => c.slug === slug) || null;
    if (!coffret) {
      coffret = coffrets[0];
      slug = coffret.slug;
      history.replaceState(null, '', `/composer.html?slug=${encodeURIComponent(slug)}`);
    }
  }

  function setQty(id, next) {
    const cur = qtyById[id] || 0;
    const others = totalPieces() - cur;
    const capacity = coffret.capacity;
    const clamped = Math.max(0, Math.min(Number(next) || 0, capacity - others));
    if (clamped <= 0) delete qtyById[id];
    else qtyById[id] = clamped;
    render();
  }

  function render() {
    state.hidden = true;
    root.hidden = false;
    document.title = `${coffret.name} — Composer · Macajou`;

    const img = coffret.image || coffret.images?.[0] || '/uploads/placeholder-coffret12.svg';
    const used = totalPieces();
    const left = remaining();
    const full = used === coffret.capacity;
    const over = used > coffret.capacity;
    const pct = Math.min(100, (used / coffret.capacity) * 100);

    root.innerHTML = `
      <div class="compose-visual">
        <img src="${esc(img)}" alt="${esc(coffret.name)}">
      </div>
      <div>
        <div class="eyebrow">Composer mon coffret</div>
        <h1>${esc(coffret.name)}</h1>
        <p class="lead">${esc(coffret.shortDescription || `Choisissez exactement ${coffret.capacity} macajoux pour remplir ce coffret.`)}</p>
        <div class="price">${esc(formatPrice(coffret.price))} · ${esc(coffret.capacity)} pièces</div>

        <label class="field-label" for="coffretSwitch">Changer de coffret</label>
        <div class="switcher">
          <select id="coffretSwitch">
            ${coffrets
              .map(
                (c) =>
                  `<option value="${esc(c.slug)}" ${c.slug === coffret.slug ? 'selected' : ''}>${esc(c.name)} (${c.capacity}) — ${esc(formatPrice(c.price))}</option>`
              )
              .join('')}
          </select>
        </div>

        <div class="meter">
          <div>
            <div class="field-label" style="margin:0">Remplissage</div>
            <strong class="${over ? 'over' : full ? 'ok' : ''}">${used} / ${coffret.capacity}</strong>
          </div>
          <div class="meter-bar"><span style="width:${pct}%"></span></div>
          <div style="font-size:.85rem;opacity:.75;min-width:7rem;text-align:right">
            ${over ? 'Trop plein' : full ? 'Complet ✓' : `Reste ${left}`}
          </div>
        </div>

        <span class="field-label">Macajoux</span>
        <div class="mac-grid" id="macGrid">
          ${macajoux
            .map((m) => {
              const q = qtyById[m._id] || 0;
              const canPlus = left > 0 || q > 0;
              return `<article class="mac-card" data-id="${esc(m._id)}">
                ${
                  m.image
                    ? `<img src="${esc(m.image)}" alt="${esc(m.name)}">`
                    : `<div class="ph">${esc(m.name.slice(0, 1))}</div>`
                }
                <div class="name">${esc(m.name)}</div>
                <div class="qty">
                  <button type="button" data-dec ${q <= 0 ? 'disabled' : ''} aria-label="Retirer">−</button>
                  <span>${q}</span>
                  <button type="button" data-inc ${!canPlus || left <= 0 ? 'disabled' : ''} aria-label="Ajouter">+</button>
                </div>
              </article>`;
            })
            .join('')}
        </div>

        <div class="actions">
          <button type="button" class="btn btn-rouge" id="addBtn" ${full ? '' : 'disabled'}>Ajouter au panier</button>
          <a class="btn btn-outline" href="/panier.html">Voir le panier</a>
          <a href="/#collection" style="font-size:.9rem;text-decoration:underline;opacity:.75">Tous les coffrets</a>
        </div>
        <p class="hint">La composition est stricte : exactement ${coffret.capacity} macajoux, pas un de plus.</p>
        <p id="composeError" style="color:var(--rouge);margin-top:.8rem;font-size:.9rem" hidden></p>
      </div>`;

    document.getElementById('coffretSwitch')?.addEventListener('change', (e) => {
      location.href = `/composer.html?slug=${encodeURIComponent(e.target.value)}`;
    });

    document.getElementById('macGrid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.mac-card');
      if (!card) return;
      const id = card.dataset.id;
      const q = qtyById[id] || 0;
      if (e.target.closest('[data-inc]')) setQty(id, q + 1);
      if (e.target.closest('[data-dec]')) setQty(id, q - 1);
    });

    document.getElementById('addBtn')?.addEventListener('click', () => {
      const err = document.getElementById('composeError');
      err.hidden = true;
      try {
        if (!window.Cart) throw new Error('Panier indisponible');
        window.Cart.addCoffret(coffret, composition(), 1);
        window.Cart.toast('Coffret ajouté au panier');
        location.href = '/panier.html';
      } catch (ex) {
        err.hidden = false;
        err.textContent = ex.message;
      }
    });
  }

  async function init() {
    try {
      await loadData();
      pickCoffret();
      qtyById = {};
      render();
    } catch (err) {
      state.hidden = false;
      root.hidden = true;
      state.textContent = err.message || 'Impossible de charger le compositeur.';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
