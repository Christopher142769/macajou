/** Composition stricte d’un coffret avec macajoux */
(function () {
  const params = new URLSearchParams(location.search);
  let slug = params.get('slug') || '';
  const trustMode = params.get('trust') === '1';
  const state = document.getElementById('state');
  const root = document.getElementById('compose');

  let coffrets = [];
  let macajoux = [];
  let coffret = null;
  /** @type {Record<string, number>} */
  let qtyById = {};
  let trustApplied = false;

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

  function applyTrustSelection() {
    qtyById = {};
    if (!macajoux.length || !coffret) return;
    const cap = coffret.capacity;
    const n = macajoux.length;
    const base = Math.floor(cap / n);
    let rem = cap % n;
    macajoux.forEach((m, i) => {
      const q = base + (i < rem ? 1 : 0);
      if (q > 0) qtyById[m._id] = q;
    });
    trustApplied = true;
  }

  async function loadData() {
    const [cRes, mRes] = await Promise.all([fetch('/api/coffrets'), fetch('/api/macajoux')]);
    if (!cRes.ok) throw new Error('Impossible de charger les coffrets');
    if (!mRes.ok) throw new Error('Impossible de charger les macajoux');
    coffrets = await cRes.json();
    macajoux = await mRes.json();
    if (!coffrets.length) throw new Error('Aucun coffret disponible');
    if (!macajoux.length) throw new Error('Aucun macajou disponible ,  ajoutez-en depuis le dashboard');
  }

  function pickCoffret() {
    if (slug) coffret = coffrets.find((c) => c.slug === slug) || null;
    if (!coffret) {
      coffret = coffrets[0];
      slug = coffret.slug;
      const trustQ = trustMode ? '&trust=1' : '';
      history.replaceState(null, '', `/composer.html?slug=${encodeURIComponent(slug)}${trustQ}`);
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

  function showAfterAdd() {
    let overlay = document.getElementById('afterAdd');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'afterAdd';
      overlay.className = 'after-add';
      overlay.innerHTML = `
        <div class="after-add-card" role="dialog" aria-labelledby="afterAddTitle" aria-modal="true">
          <p class="after-add-eyebrow">Coffret ajouté</p>
          <h2 id="afterAddTitle">Que souhaitez-vous faire ?</h2>
          <p class="after-add-lead">Votre sélection est dans le panier. Continuez vos achats ou finalisez la commande.</p>
          <div class="after-add-actions">
            <a class="btn btn-outline" href="/#collection">Continuer les achats</a>
            <a class="btn btn-rouge" href="/panier.html">Finaliser la commande</a>
          </div>
          <button type="button" class="after-add-close" data-close>Rester ici</button>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.closest('[data-close]')) {
          overlay.classList.remove('show');
        }
      });
    }
    overlay.classList.add('show');
  }

  function render() {
    state.hidden = true;
    root.hidden = false;
    document.title = `${coffret.name} ,  Composer Macajou`;

    const limited = !!(coffret.limitedEdition || Number(coffret.capacity) === 10);
    const img = limited
      ? '/assets/edition-limitee.svg'
      : coffret.image || coffret.images?.[0] || '/uploads/placeholder-coffret12.svg';
    const used = totalPieces();
    const left = remaining();
    const full = used === coffret.capacity;
    const over = used > coffret.capacity;
    const pct = Math.min(100, (used / coffret.capacity) * 100);
    const limitedNote = limited
      ? `<p class="limited-note">Édition limitée pour les occasions — emballage spécial, hors packaging Macajou classique.</p>`
      : '';

    root.innerHTML = `
      <div class="compose-visual">
        <img src="${esc(img)}" alt="${esc(coffret.name)}">
      </div>
      <div>
        <div class="eyebrow">${trustApplied ? 'Sélection de la créatrice' : 'Je compose mon coffret'}</div>
        <h1>${esc(coffret.name)}</h1>
        <p class="lead">${esc(
          trustApplied
            ? 'Voici une composition équilibrée préparée pour vous. Ajustez-la si vous le souhaitez, puis ajoutez au panier.'
            : coffret.shortDescription ||
                `Choisissez exactement ${coffret.capacity} macajoux pour remplir ce coffret.`
        )}</p>
        ${limitedNote}
        <div class="price">${esc(formatPrice(coffret.price))} · ${esc(coffret.capacity)} pièces</div>

        <label class="field-label" for="coffretSwitch">Changer de coffret</label>
        <div class="switcher">
          <select id="coffretSwitch">
            ${coffrets
              .map(
                (c) =>
                  `<option value="${esc(c.slug)}" ${c.slug === coffret.slug ? 'selected' : ''}>${esc(c.name)} (${c.capacity}) ,  ${esc(formatPrice(c.price))}</option>`
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
          <div class="meter-rest">
            ${over ? 'Trop plein' : full ? 'Complet ✓' : `Reste ${left}`}
          </div>
        </div>

        <span class="field-label">Macajoux</span>
        <p class="mac-scroll-hint">Glissez pour voir toutes les saveurs →</p>
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
          <a class="btn btn-outline" href="/">Retour à l’accueil</a>
        </div>
        <p class="hint">La composition est stricte : exactement ${coffret.capacity} macajoux, pas un de plus.</p>
        <p id="composeError" style="color:var(--rouge);margin-top:.8rem;font-size:.9rem" hidden></p>
      </div>`;

    document.getElementById('coffretSwitch')?.addEventListener('change', (e) => {
      const trustQ = trustMode ? '&trust=1' : '';
      location.href = `/composer.html?slug=${encodeURIComponent(e.target.value)}${trustQ}`;
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
        (window.Cart.showAfterAddChoice || showAfterAdd)();
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
      if (trustMode) {
        applyTrustSelection();
        // Ajout immédiat + popup (sans forcer le parcours composition manuelle)
        try {
          if (!window.Cart) throw new Error('Panier indisponible');
          window.Cart.addCoffret(coffret, composition(), 1);
          window.Cart.toast('Sélection de la créatrice ajoutée');
          render();
          (window.Cart.showAfterAddChoice || showAfterAdd)();
          return;
        } catch (ex) {
          render();
          const err = document.getElementById('composeError');
          if (err) {
            err.hidden = false;
            err.textContent = ex.message;
          }
          return;
        }
      }
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
