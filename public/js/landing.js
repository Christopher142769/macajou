/** Landing — sélection du jour + grille à composer */
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

  const LIMITED_IMG = '/assets/edition-limitee.svg';

  function isLimited(c) {
    return !!(c && (c.limitedEdition || Number(c.capacity) === 10));
  }

  function imageFor(c) {
    if (isLimited(c)) return LIMITED_IMG;
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

  function pickDayCoffret() {
    return coffrets.find((c) => c.featured) || null;
  }

  async function onTrustClick(coffretId, btn) {
    const coffret = coffrets.find((c) => String(c._id) === String(coffretId));
    if (!coffret || !window.Cart?.trustAddCoffret) return;
    const prev = btn?.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = '…';
    }
    try {
      await window.Cart.trustAddCoffret(coffret);
    } catch (err) {
      window.Cart.toast(err.message || 'Impossible d’ajouter la sélection');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = prev || 'Faire confiance à la créatrice';
      }
    }
  }

  function cardHtml(c, i, opts = {}) {
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
          <button type="button" class="coffret-cta is-trust" data-trust="${esc(c._id)}">Faire confiance à la créatrice</button>
          <a class="coffret-cta" href="${esc(href)}">Je compose</a>
        </div>
      </div>
    </article>`;
  }

  function renderDayPick(day) {
    const el = document.getElementById('dayPick');
    const head = document.getElementById('dayHead');
    if (!el) return;
    if (!day) {
      el.hidden = true;
      el.innerHTML = '';
      if (head) head.hidden = true;
      return;
    }
    el.hidden = false;
    el.className = 'coffret-grid is-day reveal in';
    el.innerHTML = cardHtml(day, 0, { isDay: true });
    if (head) head.hidden = false;
  }

  function wireTrustButtons(root) {
    root?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-trust]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      onTrustClick(btn.getAttribute('data-trust'), btn);
    });
  }

  function renderCoffrets() {
    const zone = document.getElementById('prodZone');
    const composeHead = document.getElementById('composeHead');
    if (!zone) return;

    if (!coffrets.length) {
      renderDayPick(null);
      if (composeHead) composeHead.hidden = true;
      zone.className = 'prod-zone';
      zone.innerHTML =
        '<p class="prod-empty">Les coffrets arriveront bientôt.<br>Revenez découvrir nos formats à composer.</p>';
      return;
    }

    renderDayPick(pickDayCoffret());
    if (composeHead) composeHead.hidden = false;

    zone.className = 'coffret-grid';
    zone.innerHTML = coffrets.map((c, i) => cardHtml(c, i)).join('');
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
      renderDayPick(null);
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
      wireTrustButtons(document.getElementById('dayPick'));
      wireTrustButtons(document.getElementById('prodZone'));
      loadCoffrets();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
