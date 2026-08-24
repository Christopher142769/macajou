/** Landing — coffrets + modale pyramides */
(function () {
  let coffrets = [];
  let pyramides = [];
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

  function composerUrl(slug, trust) {
    let url = '/composer.html?slug=' + encodeURIComponent(slug);
    if (trust) url += '&trust=1';
    return url;
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

  function isPyramid(item) {
    return item?.kind === 'pyramide';
  }

  function ensureCartScript(cb) {
    if (window.Cart) return cb();
    const s = document.createElement('script');
    s.src = '/js/cart.js?v=20260804-limited-photo';
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
    return [
      ...coffrets.filter((c) => c.featured).map((c) => ({ kind: 'coffret', item: c })),
      ...featuredProducts.map((p) => ({ kind: 'product', item: p })),
    ];
  }

  async function onAddProduct(productId, btn) {
    const product = featuredProducts.find((p) => String(p._id) === String(productId));
    if (!product || !window.Cart?.add) return;
    if (product.inStock === false) {
      window.Cart.toast?.('Ce produit est momentanément indisponible');
      return;
    }
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

  let pendingSlug = null;

  function openCoffretChoiceModal(slug) {
    const modal = document.getElementById('coffretChoiceModal');
    if (!modal) return;
    pendingSlug = slug || null;
    const lead = document.getElementById('coffretChoiceLead');
    if (lead) {
      lead.textContent = pendingSlug
        ? 'Pour ce coffret, confiez la sélection à la créatrice ou composez chaque macajou à votre goût.'
        : 'La créatrice connaît les saveurs du moment — laissez-vous guider pour une sélection harmonieuse.';
    }
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => modal.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
  }

  function closeCoffretChoiceModal() {
    const modal = document.getElementById('coffretChoiceModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!modal.classList.contains('is-open')) modal.hidden = true;
    }, 280);
    pendingSlug = null;
  }

  function scrollToCollection(focusDay) {
    const el = document.getElementById('collection');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (focusDay) {
      window.setTimeout(() => {
        document.getElementById('dayHead')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 420);
    }
  }

  function continueCoffretChoice(choice) {
    const slug = pendingSlug;
    closeCoffretChoiceModal();
    if (choice === 'trust') {
      if (slug) {
        location.href = composerUrl(slug, true);
      } else {
        sessionStorage.setItem('macajou_compose', 'trust');
        scrollToCollection(true);
      }
      return;
    }
    if (slug) {
      location.href = composerUrl(slug, false);
    } else {
      sessionStorage.setItem('macajou_compose', '1');
      scrollToCollection(false);
    }
  }

  function boxCardHtml(c, i, opts = {}) {
    const href = composerUrl(c.slug);
    const delay = i % 3 === 0 ? '' : i % 3 === 1 ? ' d1' : ' d2';
    const isDay = !!opts.isDay;
    const pyramid = isPyramid(c);
    const limited = isLimited(c);
    const badge = isDay ? 'Sélection du jour' : limited ? 'Édition limitée' : c.badge || '';
    const badgeClass = isDay || limited ? 'coffret-badge is-day' : 'coffret-badge';
    const ctaLabel = pyramid
      ? 'Je compose ma Pyramide'
      : isDay
        ? 'La sélection de la créatrice'
        : 'Je choisis mon coffret';
    const trustDay = isDay && !pyramid;
    const dest = trustDay ? composerUrl(c.slug, true) : href;
    const cardLinkAttrs = pyramid || trustDay
      ? `href="${esc(dest)}"`
      : `href="#" data-choose-coffret-link data-slug="${esc(c.slug)}"`;
    const ctaAttrs = pyramid || trustDay
      ? `href="${esc(dest)}"`
      : `type="button" data-choose-coffret data-slug="${esc(c.slug)}"`;
    const ctaTag = pyramid || trustDay ? 'a' : 'button';
    return `<article class="coffret-card reveal${delay} in" data-coffret-slug="${esc(c.slug)}"${pyramid ? ' data-pyramid' : ''}>
      <a class="coffret-card-link" ${cardLinkAttrs}>
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
          <${ctaTag} class="coffret-cta is-trust" ${ctaAttrs}>${esc(ctaLabel)}</${ctaTag}>
        </div>
      </div>
    </article>`;
  }

  function productCardHtml(p, i) {
    const href = productUrl(p.slug);
    const delay = i % 3 === 0 ? '' : i % 3 === 1 ? ' d1' : ' d2';
    const limited = isLimited(p);
    const inStock = p.inStock !== false;
    const badge = 'Sélection du jour';
    return `<article class="coffret-card${inStock ? '' : ' is-unavailable'} reveal${delay} in">
      <a class="coffret-card-link" href="${esc(href)}">
        <div class="coffret-card-media">
          <span class="coffret-badge is-day">${esc(badge)}</span>
          ${inStock ? '' : '<span class="coffret-badge is-unavailable">Indisponible</span>'}
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
          <button type="button" class="coffret-cta is-trust" data-add-product="${esc(p._id)}" ${inStock ? '' : 'disabled'}>${inStock ? 'Ajouter au panier' : 'Indisponible'}</button>
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
        d.kind === 'product' ? productCardHtml(d.item, i) : boxCardHtml(d.item, i, { isDay: true })
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
    zone.innerHTML = coffrets.map((c, i) => boxCardHtml(c, i)).join('');
  }

  function renderPyramidesModalGrid() {
    const grid = document.getElementById('pyramidesModalGrid');
    if (!grid) return;
    if (!pyramides.length) {
      grid.className = 'prod-zone';
      grid.innerHTML =
        '<p class="prod-empty">Les pyramides arrivent bientôt.<br>Créez-les depuis le dashboard (type Pyramide).</p>';
      return;
    }
    grid.className = 'coffret-grid' + (pyramides.length === 1 ? ' is-day is-single' : '');
    grid.innerHTML = pyramides.map((c, i) => boxCardHtml(c, i)).join('');
  }

  function openPyramidesModal() {
    const modal = document.getElementById('pyramidesModal');
    if (!modal) return;
    renderPyramidesModalGrid();
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => modal.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
  }

  function closePyramidesModal() {
    const modal = document.getElementById('pyramidesModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!modal.classList.contains('is-open')) modal.hidden = true;
    }, 280);
  }

  function wirePyramidesModal() {
    document.querySelectorAll('[data-open-pyramides]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openPyramidesModal();
      });
    });
    const modal = document.getElementById('pyramidesModal');
    modal?.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-close-pyramides]')) {
        closePyramidesModal();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.hidden) closePyramidesModal();
    });
  }

  function wireCoffretCards(root) {
    root?.addEventListener('click', (e) => {
      const choose = e.target.closest('[data-choose-coffret], [data-choose-coffret-link]');
      if (!choose) return;
      e.preventDefault();
      e.stopPropagation();
      openCoffretChoiceModal(choose.getAttribute('data-slug') || choose.closest('[data-coffret-slug]')?.getAttribute('data-coffret-slug'));
    });
  }

  function wireCoffretChoiceModal() {
    const modal = document.getElementById('coffretChoiceModal');
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-close-coffret-choice]')) {
        closeCoffretChoiceModal();
        return;
      }
      const choice = e.target.closest('[data-coffret-choice]');
      if (choice) continueCoffretChoice(choice.getAttribute('data-coffret-choice'));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.hidden) closeCoffretChoiceModal();
    });
  }

  function wireComposeCtas() {
    document.querySelectorAll('[data-compose-coffret]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        openCoffretChoiceModal(null);
      });
    });
    document.querySelectorAll('a[data-content="coffret.cta"], a[data-content="cadeaux.cta"]').forEach((a) => {
      if (a.getAttribute('href')?.includes('reservation')) {
        a.setAttribute('href', '/#collection');
      }
      if (!a.hasAttribute('data-compose-coffret')) {
        a.setAttribute('data-compose-coffret', '');
        a.addEventListener('click', (e) => {
          e.preventDefault();
          openCoffretChoiceModal(null);
        });
      }
    });
  }

  function maybeScrollToCoffrets() {
    const mode = sessionStorage.getItem('macajou_compose');
    if (!mode) return;
    sessionStorage.removeItem('macajou_compose');
    scrollToCollection(mode === 'trust');
  }

  async function loadCatalog() {
    const zone = document.getElementById('prodZone');
    try {
      const [cRes, pRes, yRes] = await Promise.all([
        fetch('/api/coffrets?kind=coffret'),
        fetch('/api/products?featured=1'),
        fetch('/api/coffrets?kind=pyramide'),
      ]);
      if (!cRes.ok) throw new Error('API coffrets indisponible');
      coffrets = await cRes.json();
      featuredProducts = pRes.ok ? await pRes.json() : [];
      pyramides = yRes.ok ? await yRes.json() : [];
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
      wireCoffretChoiceModal();
      wirePyramidesModal();
      wireDayActions(document.getElementById('dayPick'));
      wireDayActions(document.getElementById('prodZone'));
      wireCoffretCards(document.getElementById('prodZone'));
      wireCoffretCards(document.getElementById('pyramidesModalGrid'));
      loadCatalog();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
