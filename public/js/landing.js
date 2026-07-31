/** Landing — section Coffrets (cartes attrayantes → composition) */
(function () {
  let coffrets = [];

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

  function imageFor(c) {
    return c.image || (c.images && c.images[0]) || '/uploads/placeholder-coffret12.svg';
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

  function renderCoffrets() {
    const zone = document.getElementById('prodZone');
    if (!zone) return;

    if (!coffrets.length) {
      zone.innerHTML =
        '<p class="prod-empty">Les coffrets arriveront bientôt.<br>Revenez découvrir nos formats à composer.</p>';
      return;
    }

    zone.className = 'coffret-grid';
    zone.innerHTML = coffrets
      .map((c, i) => {
        const href = composerUrl(c.slug);
        const delay = i % 3 === 0 ? '' : i % 3 === 1 ? ' d1' : ' d2';
        return `<a class="coffret-card reveal${delay} in" href="${esc(href)}">
          <div class="coffret-card-media">
            ${c.badge ? `<span class="coffret-badge">${esc(c.badge)}</span>` : ''}
            <img src="${esc(imageFor(c))}" alt="${esc(c.name)}" loading="lazy">
            <div class="coffret-card-glow" aria-hidden="true"></div>
          </div>
          <div class="coffret-card-body">
            <h3>${esc(c.name)}</h3>
            <p class="coffret-count"><span>${esc(c.capacity)}</span> macajoux</p>
            ${c.shortDescription ? `<p class="coffret-desc">${esc(c.shortDescription)}</p>` : ''}
            <div class="coffret-foot">
              <strong class="coffret-price">${esc(formatPrice(c.price))}</strong>
              <span class="coffret-cta">Choisir</span>
            </div>
          </div>
        </a>`;
      })
      .join('');
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

  async function loadCoffrets() {
    const zone = document.getElementById('prodZone');
    try {
      const res = await fetch('/api/coffrets');
      if (!res.ok) throw new Error('API coffrets indisponible');
      coffrets = await res.json();
      renderCoffrets();
      maybeScrollToCoffrets();
    } catch (err) {
      console.error(err);
      if (zone) {
        zone.innerHTML =
          '<p class="prod-empty">Impossible de charger les coffrets. Vérifiez que le serveur tourne.</p>';
      }
    }
  }

  function init() {
    ensureCartScript(() => {
      wireCartBadge();
      wireComposeCtas();
      loadCoffrets();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
