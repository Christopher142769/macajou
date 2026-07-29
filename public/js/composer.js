/** Page de composition d’un coffret Macajou */
(function () {
  const params = new URLSearchParams(location.search);
  let slug = params.get('slug') || '';
  const state = document.getElementById('state');
  const root = document.getElementById('compose');

  let coffrets = [];
  let product = null;
  let selected = new Set();

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function formatPrice(n) {
    return window.Cart ? window.Cart.formatPrice(n) : `${Number(n).toLocaleString('fr-FR')} FCFA`;
  }

  function flavorNames(p) {
    const list = (p?.flavors || []).map((f) => (typeof f === 'string' ? f : f.name)).filter(Boolean);
    return [...new Set(list)];
  }

  async function loadCoffrets() {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Impossible de charger les coffrets');
    const all = await res.json();
    coffrets = all.filter((p) => String(p.category || '').toLowerCase() === 'coffrets' && p.active !== false);
    if (!coffrets.length) throw new Error('Aucun coffret disponible pour le moment');
  }

  function pickProduct() {
    if (slug) {
      product = coffrets.find((p) => p.slug === slug) || null;
    }
    if (!product) {
      product = coffrets[0];
      slug = product.slug;
      history.replaceState(null, '', `/composer.html?slug=${encodeURIComponent(slug)}`);
    }
  }

  function render() {
    state.hidden = true;
    root.hidden = false;
    document.title = `${product.name} — Composer · Macajou`;

    const img = product.images?.[0] || '/uploads/placeholder-coffret12.svg';
    const flavors = flavorNames(product);
    const selectedList = [...selected];

    root.innerHTML = `
      <div class="compose-visual">
        <img src="${esc(img)}" alt="${esc(product.name)}">
      </div>
      <div>
        <div class="eyebrow">Composer mon coffret</div>
        <h1>${esc(product.name)}</h1>
        <p class="lead">${esc(product.shortDescription || product.description || 'Choisissez les parfums que vous souhaitez dans ce coffret. Notre atelier se charge de la répartition.')}</p>
        <div class="price">${esc(formatPrice(product.price))}</div>

        <label class="field-label" for="coffretSwitch">Changer de coffret</label>
        <div class="switcher">
          <select id="coffretSwitch">
            ${coffrets
              .map(
                (c) =>
                  `<option value="${esc(c.slug)}" ${c.slug === product.slug ? 'selected' : ''}>${esc(c.name)} — ${esc(formatPrice(c.price))}</option>`
              )
              .join('')}
          </select>
        </div>

        <span class="field-label">Parfums du coffret</span>
        ${
          flavors.length
            ? `<div class="flavor-grid" id="flavorGrid">
            ${flavors
              .map((name) => {
                const on = selected.has(name);
                return `<label class="flavor-opt${on ? ' is-on' : ''}">
                  <input type="checkbox" value="${esc(name)}" ${on ? 'checked' : ''}>
                  <span class="name">${esc(name)}</span>
                </label>`;
              })
              .join('')}
          </div>`
            : `<p class="hint">Aucun parfum n’est encore associé à ce coffret. Ajoutez-les depuis le dashboard.</p>`
        }

        <div class="summary-box" id="summary">
          <strong>Votre sélection</strong><br>
          ${
            selectedList.length
              ? selectedList.map(esc).join(' · ')
              : 'Cochez au moins un parfum pour continuer.'
          }
        </div>

        <div class="actions">
          <button type="button" class="btn btn-rouge" id="addBtn" ${selectedList.length ? '' : 'disabled'}>Ajouter au panier</button>
          <a class="btn btn-outline" href="/panier.html">Voir le panier</a>
          <a href="/#collection" style="font-size:.9rem;text-decoration:underline;opacity:.75">Retour à la collection</a>
        </div>
        <p class="hint">Vous pourrez encore modifier les quantités dans le panier avant de payer.</p>
        <p id="composeError" style="color:var(--rouge);margin-top:.8rem;font-size:.9rem" hidden></p>
      </div>`;

    document.getElementById('coffretSwitch')?.addEventListener('change', (e) => {
      location.href = `/composer.html?slug=${encodeURIComponent(e.target.value)}`;
    });

    document.getElementById('flavorGrid')?.addEventListener('change', (e) => {
      const input = e.target.closest('input[type="checkbox"]');
      if (!input) return;
      if (input.checked) selected.add(input.value);
      else selected.delete(input.value);
      render();
    });

    document.getElementById('addBtn')?.addEventListener('click', () => {
      const err = document.getElementById('composeError');
      err.hidden = true;
      const flavorsChosen = [...selected];
      if (!flavorsChosen.length) {
        err.hidden = false;
        err.textContent = 'Choisissez au moins un parfum.';
        return;
      }
      if (!window.Cart) {
        err.hidden = false;
        err.textContent = 'Panier indisponible.';
        return;
      }
      window.Cart.add(product, 1, { flavors: flavorsChosen });
      window.Cart.toast('Coffret ajouté au panier');
      location.href = '/panier.html';
    });
  }

  async function init() {
    try {
      await loadCoffrets();
      pickProduct();
      selected = new Set();
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
