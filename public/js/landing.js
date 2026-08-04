/** Landing — sélection du jour + grille à composer */
(function () {
  let coffrets = [];
  let featuredProducts = [];

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function formatPrice(n) {
    if (window.Cart && window.Cart.formatPrice) return window.Cart.formatPrice(n);
    return Number(n).toLocaleString('fr-FR') + ' FCFA';
  }

  function composerUrl(slug) {
    return '/composer.html?slug=' + encodeURIComponent(slug);
  }

  function productUrl(slug) {
    return '/produit.html?slug=' + encodeURIComponent(slug);
  }

  function isLimited(item) {
    return !!(item && (item.limitedEdition || Number(item.capacity) === 10));
  }

  function imageFor(item) {
    return item.image || (item.images && item.images[0]) || '/uploads/placeholder-coffret12.svg';
  }

  function ensureCartScript(cb) {
    if (window.Cart) return cb();
    const s = document.createElement('script');
    s.src = '/js/cart.js';
    s.onload = cb;
    s.onerror = cb;
    document.head.appendChild(s);
  }

  function wireCartBadge() {
    const cartLink =
      document.querySelector('.nav-ic[href="/panier.html"]') ||
      document.querySelector('.nav-ic[aria-label="Panier"]') ||
      document.querySelector('.nav-ic[href="#commande"]');
    if (cartLink) {
      cartLink.setAttribute('href', '/panier.html');
      cartLink.style.position = 'relative';
      if (!cartLink.querySelector('[data-cart-count]')) {
        const badge = document.createElement('span');
        badge.setAttribute('data-cart-count', '');
        badge.hidden = true;
        badge.style.cssText =
          'position:absolute;top:-6px;right:-8px;background:#B5121B;color:#FBF5E8;font-size:10px;min-width:16px;height:16px;border-radius:50%;display:grid;place-items:center;font-family:Jost,sans-serif;letter-spacing:0';
        cartLink.appendChild(badge);
      }
    }
    window.Cart && window.Cart.updateBadges();
  }

  function daySelection() {
    const days = [
      ...coffrets.filter((c) => c.featured).map((c) => ({ kind: 'coffret', item: c })),
      ...featuredProducts.map((p) => ({ kind: 'product', item: p })),
    ];
    return days;
  }

  async function onAddProduct(productId, btn) {
    const product = featuredProducts.find((p) => String(p._id) === String(productId));
    if (!product || !window.Cart?.add) return;
    const prev = btn?.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = '…';
    }
    try {
      window.Cart.add(product, 1);
      window.Cart.toast('Ajouté au panier');
      window.Cart.showAfterAddChoice?.();
    } catch (err) {
      window.Cart.toast(err.message || 'Impossible d’ajouter');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = prev || 'Ajouter au panier';
      }
    }
  }

  function coffretCardHtml(c, i, opts = {}) {
    const href = composerUrl(c.slug);
    const delay = i % 3 === 0 ? '' : i % 3 === 1 ? ' d1' : ' d2';
    const isDay = !!opts.isDay;
    const limited = isLimited(c);
    const badge = isDay ? 'Sélection du jour' : limited ? 'Édition limitée' : c.badge || '';
    const badgeClass = isDay || limited ? 'coffret-badge is-day' : 'coffret-badge';
    return `<article class="coffret-card reveal${delay} in">
      <a class="coffret-card-link" href="${esc(href)}">
        <div class="coffret-card-media">
          ${badge ? `<span class="${badgeClass}">${esc(badge)}</span>` : ''}
          <img src="${esc(imageFor(c))}" alt="${esc(c.name)}" loading="lazy">
          <div class="coffret-card-glow" aria-hidden="true"></div>
        </div>
        <div class="coffret-card-body">
          <h3>${esc(c.name)}</h3>
          <p class="coffret-count"><span>${esc(c.capacity)}</span> macajoux</p>
          ${
            limited
              ? `<p class="coffret-desc">Édition limitée pour les occasions — emballage spécial, hors packaging Macajou classique.</p>`
              : c.shortDescription
                ? `<p class="coffret-desc">${esc(c.shortDescription)}</p>`
                : ''
          }
        </div>
      </a>
      <div class="coffret-foot">
        <strong class="coffret-price">${esc(formatPrice(c.price))}</strong>
        <div class="coffret-ctas">
          <a class="coffret-cta is-trust" href="${esc(href)}">Je compose mon Coffret</a>
        </div>
      </div>
    </article>`;
  }

  function productCardHtml(p, i) {
    const href = productUrl(p.slug);
    const delay = i % 3 === 0 ? '' : i % 3 === 1 ? ' d1' : ' d2';
    const limited = isLimited(p);
    const badge = 'Sélection du jour';
    return `<article class="coffret-card reveal${delay} in">
      <a class="coffret-card-link" href="${esc(href)}">
        <div class="coffret-card-media">
          <span class="coffret-badge is-day">${esc(badge)}</span>
          <img src="${esc(imageFor(p))}" alt="${esc(p.name)}" loading="lazy">
          <div class="coffret-card-glow" aria-hidden="true"></div>
        </div>
        <div class="coffret-card-body">
          <h3>${esc(p.name)}</h3>
          ${p.category ? `<p class="coffret-count">${esc(p.category)}</p>` : ''}
          ${
            limited
              ? `<p class="coffret-desc">Édition limitée pour les occasions — emballage spécial, hors packaging Macajou classique.</p>`
              : p.shortDescription
                ? `<p class="coffret-desc">${esc(p.shortDescription)}</p>`
                : ''
          }
        </div>
      </a>
      <div class="coffret-foot">
        <strong class="coffret-price">${esc(formatPrice(p.price))}</strong>
        <div class="coffret-ctas">
          <button type="button" class="coffret-cta is-trust" data-add-product="${esc(p._id)}">Ajouter au panier</button>
          <a class="coffret-cta" href="${esc(href)}">Voir</a>
        </div>
      </div>
    </article>`;
  }

  function renderDayPick() {
    const el = document.getElementById('dayPick');
    const head = document.getElementById('dayHead');
    if (!el) return;
    const days = daySelection();
    if (!days.length) {
      el.hidden = true;
      el.innerHTML = '';
      if (head) head.hidden = true;
      return;
    }
    el.hidden = false;
    el.className =
      'coffret-grid is-day reveal in' + (days.length === 1 ? ' is-single' : '');
    el.innerHTML = days
      .map((d, i) =>
        d.kind === 'product' ? productCardHtml(d.item, i) : coffretCardHtml(d.item, i, { isDay: true })
      )
      .join('');
    if (head) head.hidden = false;
  }

  function wireDayActions(root) {
    root?.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add-product]');
      if (add) {
        e.preventDefault();
        e.stopPropagation();
        onAddProduct(add.getAttribute('data-add-product'), add);
      }
    });
  }

  function renderCoffrets() {
    const zone = document.getElementById('prodZone');
    const composeHead = document.getElementById('composeHead');
    if (!zone) return;

    if (!coffrets.length) {
      renderDayPick();
      if (composeHead) composeHead.hidden = true;
      zone.className = 'prod-zone';
      zone.innerHTML =
        '<p class="prod-empty">Les coffrets arriveront bientôt.<br>Revenez découvrir nos formats à composer.</p>';
      return;
    }

    renderDayPick();
    if (composeHead) composeHead.hidden = false;

    zone.className = 'coffret-grid';
    zone.innerHTML = coffrets.map((c, i) => coffretCardHtml(c, i)).join('');
  }

  function wireComposeCtas() {
    document.querySelectorAll('[data-compose-coffret]').forEach((a) => {
      a.addEventListener('click', () => {
        sessionStorage.setItem('macajou_compose', '1');
      });
    });
    document.querySelectorAll('a[data-content="coffret.cta"], a[data-content="cadeaux.cta"]').forEach((a) => {
      if (a.getAttribute('href')?.includes('reservation')) {
        a.setAttribute('href', '/#collection');
      }
      a.addEventListener('click', () => sessionStorage.setItem('macajou_compose', '1'));
    });
  }

  function maybeScrollToCoffrets() {
    if (sessionStorage.getItem('macajou_compose') === '1') {
      sessionStorage.removeItem('macajou_compose');
      const el = document.getElementById('collection');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function loadCatalog() {
    const zone = document.getElementById('prodZone');
    try {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/coffrets'),
        fetch('/api/products?featured=1'),
      ]);
      if (!cRes.ok) throw new Error('API coffrets indisponible');
      coffrets = await cRes.json();
      featuredProducts = pRes.ok ? await pRes.json() : [];
      renderCoffrets();
      maybeScrollToCoffrets();
    } catch (err) {
      console.error(err);
      renderDayPick();
      const composeHead = document.getElementById('composeHead');
      if (composeHead) composeHead.hidden = true;
      if (zone) {
        zone.className = 'prod-zone';
        zone.innerHTML =
          '<p class="prod-empty">Impossible de charger les coffrets. Vérifiez que le serveur tourne.</p>';
      }
    }
  }

  function init() {
    ensureCartScript(() => {
      wireCartBadge();
      wireComposeCtas();
      wireDayActions(document.getElementById('dayPick'));
      wireDayActions(document.getElementById('prodZone'));
      loadCatalog();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
