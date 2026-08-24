/** Fiche coffret — composition manuelle ou confiance à la créatrice */
(function () {
  const params = new URLSearchParams(location.search);
  let slug = params.get('slug') || '';
  const trustLocked = params.get('trust') === '1';
  const state = document.getElementById('state');
  const root = document.getElementById('compose');

  let coffrets = [];
  let macajoux = [];
  let coffret = null;
  /** @type {Record<string, number>} */
  let qtyById = {};
  let trustOn = false;

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
        quantity: qtyById[String(m._id)] || 0,
      }))
      .filter((c) => c.quantity > 0);
  }

  function availableMacajoux() {
    return macajoux.filter((m) => m.available !== false);
  }

  function applyTrustSelection() {
    qtyById = {};
    const list = availableMacajoux();
    if (!list.length || !coffret) return;
    if (window.Cart?.buildTrustComposition) {
      const built = window.Cart.buildTrustComposition(list, coffret.capacity);
      built.forEach((c) => {
        qtyById[String(c.macajouId)] = c.quantity;
      });
      return;
    }
    const cap = coffret.capacity;
    const n = list.length;
    const base = Math.floor(cap / n);
    let rem = cap % n;
    list.forEach((m, i) => {
      const q = base + (i < rem ? 1 : 0);
      if (q > 0) qtyById[String(m._id)] = q;
    });
  }

  function clearComposition() {
    qtyById = {};
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
      history.replaceState(null, '', `/composer.html?slug=${encodeURIComponent(slug)}`);
    }
  }

  function kindMeta() {
    const pyramid = coffret?.kind === 'pyramide';
    return {
      pyramid,
      label: pyramid ? 'pyramide' : 'coffret',
      Label: pyramid ? 'Pyramide' : 'Coffret',
      composeEyebrow: pyramid ? 'Je compose ma pyramide' : 'Je compose mon coffret',
      switchLabel: pyramid ? 'Changer de pyramide' : 'Changer de coffret',
      sameKind: coffrets.filter((c) => (c.kind === 'pyramide') === pyramid),
      trustReady: pyramid
        ? `La créatrice compose cette pyramide pour vous (${coffret.capacity} macajoux). Ajoutez-la au panier pour continuer.`
        : `La créatrice compose ce coffret pour vous (${coffret.capacity} macajoux). Ajoutez-le au panier pour continuer.`,
      fillHint: pyramid
        ? `Choisissez exactement ${coffret.capacity} macajoux pour remplir cette pyramide.`
        : `Choisissez exactement ${coffret.capacity} macajoux pour remplir ce coffret.`,
      trustToggleHint: pyramid
        ? 'Elle compose la pyramide pour vous — les saveurs se masquent.'
        : 'Elle compose le coffret pour vous — les saveurs se masquent.',
      afterEyebrow: pyramid ? 'Pyramide ajoutée' : 'Coffret ajouté',
      toastOk: pyramid ? 'Pyramide ajoutée au panier' : 'Coffret ajouté au panier',
    };
  }

  function setQty(id, next) {
    if (trustOn) return;
    const mac = macajoux.find((m) => String(m._id) === String(id));
    if (mac && mac.available === false) return;
    const key = String(id);
    const cur = qtyById[key] || 0;
    const others = totalPieces() - cur;
    const capacity = coffret.capacity;
    const clamped = Math.max(0, Math.min(Number(next) || 0, capacity - others));
    if (clamped <= 0) delete qtyById[key];
    else qtyById[key] = clamped;
    render();
  }

  function showAfterAdd() {
    const meta = kindMeta();
    let overlay = document.getElementById('afterAdd');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'afterAdd';
      overlay.className = 'after-add';
      overlay.innerHTML = `
        <div class="after-add-card" role="dialog" aria-labelledby="afterAddTitle" aria-modal="true">
          <p class="after-add-eyebrow" data-after-eyebrow>${esc(meta.afterEyebrow)}</p>
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
    } else {
      const eye = overlay.querySelector('[data-after-eyebrow]');
      if (eye) eye.textContent = meta.afterEyebrow;
    }
    overlay.classList.add('show');
  }

  function setTrust(on) {
    trustOn = !!on;
    if (trustOn) applyTrustSelection();
    else clearComposition();
    render();
  }

  function render() {
    state.hidden = true;
    root.hidden = false;
    Object.keys(qtyById).forEach((id) => {
      const m = macajoux.find((x) => String(x._id) === id);
      if (m && m.available === false) delete qtyById[id];
    });
    document.title = `${coffret.name} ,  Macajou`;

    const meta = kindMeta();
    const limited = !!(coffret.limitedEdition || Number(coffret.capacity) === 10);
    const img =
      coffret.image || coffret.images?.[0] || '/uploads/placeholder-coffret12.svg';
    const used = totalPieces();
    const left = remaining();
    const full = used === coffret.capacity;
    const over = used > coffret.capacity;
    const pct = Math.min(100, (used / coffret.capacity) * 100);
    const canAdd = trustOn || full;
    const limitedNote = limited
      ? `<p class="limited-note">Édition limitée pour les occasions — emballage spécial, hors packaging Macajou classique.</p>`
      : '';
    const limitedBadge = limited
      ? `<span class="compose-badge">Édition limitée</span>`
      : '';
    const limitedInfoBadge = limited
      ? `<div class="info-badge">Édition limitée</div>`
      : '';

    const composeBlock = trustOn
      ? `<p class="trust-ready">${esc(meta.trustReady)}</p>`
      : `
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
              const q = qtyById[String(m._id)] || 0;
              const canPlus = left > 0 || q > 0;
              const available = m.available !== false;
              return `<article class="mac-card${available ? '' : ' is-unavailable'}" data-id="${esc(m._id)}"${available ? '' : ' aria-disabled="true"'}>
                ${
                  m.image
                    ? `<img src="${esc(m.image)}" alt="${esc(m.name)}">`
                    : `<div class="ph">${esc(m.name.slice(0, 1))}</div>`
                }
                <div class="name">${esc(m.name)}</div>
                ${
                  available
                    ? `<div class="qty">
                  <button type="button" data-dec ${q <= 0 ? 'disabled' : ''} aria-label="Retirer">−</button>
                  <span>${q}</span>
                  <button type="button" data-inc ${!canPlus || left <= 0 ? 'disabled' : ''} aria-label="Ajouter">+</button>
                </div>`
                    : '<span class="mac-unavailable">Indisponible</span>'
                }
              </article>`;
            })
            .join('')}
        </div>`;

    root.innerHTML = `
      <div class="compose-visual">
        ${limitedBadge}
        <img src="${esc(img)}" alt="${esc(coffret.name)}">
      </div>
      <div>
        ${limitedInfoBadge}
        <div class="eyebrow">${esc(meta.composeEyebrow)}</div>
        <h1>${esc(coffret.name)}</h1>
        <p class="lead">${esc(coffret.shortDescription || meta.fillHint)}</p>
        ${limitedNote}
        <div class="price">${esc(formatPrice(coffret.price))} · ${esc(coffret.capacity)} pièces</div>

        <label class="field-label" for="coffretSwitch">${esc(meta.switchLabel)}</label>
        <div class="switcher">
          <select id="coffretSwitch">
            ${meta.sameKind
              .map(
                (c) =>
                  `<option value="${esc(c.slug)}" ${c.slug === coffret.slug ? 'selected' : ''}>${esc(c.name)} (${c.capacity}) ,  ${esc(formatPrice(c.price))}</option>`
              )
              .join('')}
          </select>
        </div>

        ${
          trustLocked
            ? ''
            : `<label class="trust-toggle" for="trustToggle">
          <span class="trust-toggle-text">
            <strong>Faire confiance à la créatrice</strong>
            <em>${esc(meta.trustToggleHint)}</em>
          </span>
          <input type="checkbox" id="trustToggle" ${trustOn ? 'checked' : ''} role="switch" aria-checked="${trustOn ? 'true' : 'false'}">
          <span class="trust-switch" aria-hidden="true"></span>
        </label>`
        }

        ${composeBlock}

        <div class="actions">
          <button type="button" class="btn btn-rouge" id="addBtn" ${canAdd ? '' : 'disabled'}>Ajouter au panier</button>
          ${
            meta.pyramid
              ? `<a class="btn btn-invite-pyramides" href="/#maison">Voir les pyramides Macajou</a>`
              : `<a class="btn btn-outline" href="/panier.html">Voir le panier</a>`
          }
          <a class="btn btn-outline" href="/">Retour à l’accueil</a>
        </div>
        <p class="hint">${
          trustOn
            ? `Sélection de la créatrice : ${meta.label} prêt${meta.pyramid ? 'e' : ''} à être ajouté${meta.pyramid ? 'e' : ''} au panier.`
            : `La composition est stricte : exactement ${coffret.capacity} macajoux, pas un de plus.`
        }</p>
        <p id="composeError" style="color:var(--rouge);margin-top:.8rem;font-size:.9rem" hidden></p>
      </div>`;

    document.getElementById('coffretSwitch')?.addEventListener('change', (e) => {
      const next = `/composer.html?slug=${encodeURIComponent(e.target.value)}`;
      location.href = trustLocked ? `${next}&trust=1` : next;
    });

    document.getElementById('trustToggle')?.addEventListener('change', (e) => {
      setTrust(e.target.checked);
    });

    document.getElementById('macGrid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.mac-card');
      if (!card) return;
      const id = String(card.dataset.id);
      const q = qtyById[id] || 0;
      if (e.target.closest('[data-inc]')) setQty(id, q + 1);
      if (e.target.closest('[data-dec]')) setQty(id, q - 1);
    });

    document.getElementById('addBtn')?.addEventListener('click', () => {
      const err = document.getElementById('composeError');
      err.hidden = true;
      try {
        if (!window.Cart) throw new Error('Panier indisponible');
        if (trustOn) applyTrustSelection();
        window.Cart.addCoffret(coffret, composition(), 1);
        window.Cart.toast(trustOn ? 'Sélection de la créatrice ajoutée' : meta.toastOk);
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
      clearComposition();
      if (params.get('trust') === '1') setTrust(true);
      else render();
    } catch (err) {
      state.hidden = false;
      root.hidden = true;
      state.textContent = err.message || 'Impossible de charger le coffret.';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
