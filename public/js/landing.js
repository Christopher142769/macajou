/** Landing page: collection dynamique depuis l’API + panier */
(function () {
  const CART_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 8h14l-1.2 12H6.2L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>';

  let allProducts = [];
  let currentCat = 'all';

  function productUrl(slug) {
    return '/produit.html?slug=' + encodeURIComponent(slug);
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function formatPrice(n) {
    if (window.Cart && window.Cart.formatPrice) return window.Cart.formatPrice(n);
    return Number(n).toLocaleString('fr-FR') + ' FCFA';
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

  function imageFor(product) {
    const img = product.images && product.images[0];
    return img || '/uploads/placeholder-coffret12.svg';
  }

  function filteredProducts() {
    if (currentCat === 'all') return allProducts;
    return allProducts.filter((p) => p.category === currentCat);
  }

  function renderProducts() {
    const zone = document.getElementById('prodZone');
    if (!zone) return;

    const products = filteredProducts();

    if (!allProducts.length) {
      zone.innerHTML =
        '<p class="prod-empty">Aucun produit pour le moment.<br>La collection apparaîtra ici dès qu’elle sera publiée depuis le dashboard.</p>';
      return;
    }

    if (!products.length) {
      zone.innerHTML =
        '<p class="prod-empty">Aucun produit dans cette catégorie. <a href="#collection" data-cat-reset>Voir tout</a></p>';
      zone.querySelector('[data-cat-reset]')?.addEventListener('click', (e) => {
        e.preventDefault();
        setCategory('all');
      });
      return;
    }

    zone.innerHTML = products
      .map((p, i) => {
        const feature = i === 0 ? ' feature' : '';
        const delay = i === 0 ? '' : i % 2 === 0 ? ' d2' : ' d1';
        const tag = p.badge ? `<span class="tag">${esc(p.badge)}</span>` : '';
        const img = esc(imageFor(p));
        const name = esc(p.name);
        const slug = esc(p.slug);
        const price = esc(formatPrice(p.price));
        const short = p.shortDescription ? ` · ${esc(p.shortDescription)}` : '';
        return `<article class="tile${feature} reveal${delay} in" data-slug="${slug}" data-id="${esc(p._id)}">
          ${tag}
          <div class="tile-visu">
            <a class="tile-link" href="${productUrl(p.slug)}" aria-label="Voir ${name}" style="position:absolute;inset:0;z-index:1"></a>
            <img src="${img}" alt="${name}" loading="lazy">
          </div>
          <div class="add-bar" data-slug="${slug}" data-p="${name}" style="transform:none;z-index:3">
            <span>Ajouter au panier</span>${CART_SVG}
          </div>
          <div class="tile-info">
            <h3><a href="${productUrl(p.slug)}" style="text-decoration:none;color:inherit">${name}</a></h3>
            <div class="prix">${price}${short}</div>
          </div>
        </article>`;
      })
      .join('');

    wireAddBars();
  }

  function setCategory(cat) {
    currentCat = cat || 'all';
    document.querySelectorAll('#catNav a').forEach((a) => {
      a.classList.toggle('active', a.dataset.cat === currentCat);
    });
    renderProducts();
  }

  function wireCategories() {
    const nav = document.getElementById('catNav');
    if (!nav) return;
    nav.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-cat]');
      if (!a) return;
      e.preventDefault();
      setCategory(a.dataset.cat);
    });
  }

  async function loadCategoriesNav() {
    const nav = document.getElementById('catNav');
    if (!nav) return;
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('API catégories indisponible');
      const items = await res.json();
      nav.innerHTML = [
        ...items.map(
          (category) =>
            `<a href="#collection" data-cat="${esc(category.name)}">${esc(category.name)}</a><span class="dot">·</span>`
        ),
        '<a class="active" href="#collection" data-cat="all">Voir tout</a>',
      ].join('');
    } catch (err) {
      console.error(err);
    }
  }

  async function addToCartBySlug(slug) {
    const local = allProducts.find((p) => p.slug === slug);
    let product = local;
    if (!product) {
      const res = await fetch('/api/products/slug/' + encodeURIComponent(slug));
      if (!res.ok) throw new Error('Produit introuvable');
      product = await res.json();
    }
    if (!window.Cart) throw new Error('Panier indisponible');
    window.Cart.add(product, 1);
    window.Cart.updateBadges();
    window.Cart.toast('Ajouté au panier');
    return product;
  }

  function wireAddBars() {
    document.querySelectorAll('#prodZone .add-bar').forEach((bar) => {
      bar.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const slug = bar.dataset.slug;
        if (!slug) return;
        const span = bar.querySelector('span');
        if (span) span.textContent = 'Ajout…';
        try {
          await addToCartBySlug(slug);
          if (span) span.textContent = 'Ajouté ✓';
          setTimeout(() => {
            location.href = productUrl(slug);
          }, 350);
        } catch (err) {
          console.error(err);
          location.href = productUrl(slug);
        }
      });
    });
  }

  function wireWhatsAppCtas() {
    document.querySelectorAll('a[href*="wa.me"]').forEach((a) => {
      a.href = '/panier.html';
      a.removeAttribute('target');
      a.removeAttribute('rel');
      if (/whatsapp/i.test(a.textContent)) a.textContent = 'Voir mon panier';
    });
  }

  async function loadProducts() {
    const zone = document.getElementById('prodZone');
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('API produits indisponible');
      allProducts = await res.json();
      // Featured first, then newest
      allProducts.sort((a, b) => {
        if (!!b.featured - !!a.featured) return !!b.featured - !!a.featured;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      renderProducts();
    } catch (err) {
      console.error(err);
      if (zone) {
        zone.innerHTML =
          '<p class="prod-empty">Impossible de charger la collection. Vérifiez que le serveur tourne.</p>';
      }
    }
  }

  async function init() {
    await loadCategoriesNav();
    ensureCartScript(() => {
      wireCartBadge();
      wireCategories();
      wireWhatsAppCtas();
      loadProducts();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
