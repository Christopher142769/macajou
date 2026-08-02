const Cart = (() => {
  const KEY = 'macajou_cart';

  function normalizeFlavors(flavors) {
    if (!Array.isArray(flavors)) return [];
    return [...new Set(flavors.map((f) => String(f || '').trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'fr')
    );
  }

  function normalizeComposition(composition) {
    if (!Array.isArray(composition)) return [];
    return composition
      .map((c) => ({
        macajouId: String(c.macajouId || c.macajou || c.id || ''),
        name: String(c.name || '').trim(),
        image: c.image || '',
        quantity: Math.max(0, Number(c.quantity) || 0),
      }))
      .filter((c) => c.macajouId && c.quantity > 0)
      .sort((a, b) => a.macajouId.localeCompare(b.macajouId));
  }

  function compositionKey(composition) {
    return normalizeComposition(composition)
      .map((c) => `${c.macajouId}x${c.quantity}`)
      .join('|');
  }

  function lineKey(productId, flavorsOrComposition, type = 'product') {
    if (type === 'coffret') {
      return `coffret:${productId}::${compositionKey(flavorsOrComposition)}`;
    }
    const f = normalizeFlavors(flavorsOrComposition);
    return f.length ? `${productId}::${f.join('|')}` : String(productId);
  }

  function read() {
    try {
      const items = JSON.parse(localStorage.getItem(KEY) || '[]');
      return items.map((i) => {
        const type = i.type || (i.composition ? 'coffret' : 'product');
        const composition = normalizeComposition(i.composition);
        const flavors = normalizeFlavors(i.flavors);
        return {
          ...i,
          type,
          composition,
          flavors,
          lineKey:
            i.lineKey ||
            lineKey(i.productId || i.coffretId, type === 'coffret' ? composition : flavors, type),
        };
      });
    } catch {
      return [];
    }
  }

  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('macajou:cart', { detail: items }));
    updateBadges();
  }

  function add(product, qty = 1, options = {}) {
    const items = read();
    const id = String(product._id || product.id);
    const flavors = normalizeFlavors(options.flavors);
    const key = lineKey(id, flavors, 'product');
    const existing = items.find((i) => i.lineKey === key);
    if (existing) existing.quantity += qty;
    else {
      const limited = !!product.limitedEdition;
      items.push({
        type: 'product',
        productId: id,
        lineKey: key,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: limited
          ? '/assets/edition-limitee.svg'
          : product.images?.[0] || product.image || '',
        quantity: qty,
        flavors,
        category: product.category || '',
        limitedEdition: limited,
      });
    }
    write(items);
    return items;
  }

  function addCoffret(coffret, composition, qty = 1) {
    const items = read();
    const id = String(coffret._id || coffret.id);
    const comp = normalizeComposition(composition);
    const pieces = comp.reduce((n, c) => n + c.quantity, 0);
    const capacity = Number(coffret.capacity) || 0;
    if (!comp.length) throw new Error('Choisissez des macajoux');
    if (pieces > capacity) throw new Error(`Maximum ${capacity} macajoux pour ce coffret`);
    if (pieces < capacity) throw new Error(`Complétez le coffret : ${pieces}/${capacity}`);

    const key = lineKey(id, comp, 'coffret');
    const existing = items.find((i) => i.lineKey === key);
    if (existing) existing.quantity += qty;
    else {
      items.push({
        type: 'coffret',
        productId: id,
        coffretId: id,
        lineKey: key,
        slug: coffret.slug,
        name: coffret.name,
        price: coffret.price,
        image:
          coffret.limitedEdition || Number(coffret.capacity) === 10
            ? '/assets/edition-limitee.svg'
            : coffret.image || coffret.images?.[0] || '',
        quantity: qty,
        capacity,
        limitedEdition: !!(coffret.limitedEdition || capacity === 10),
        composition: comp,
        flavors: comp.map((c) => `${c.name} ×${c.quantity}`),
      });
    }
    write(items);
    return items;
  }

  function setQty(keyOrId, quantity) {
    let items = read();
    items = items
      .map((i) =>
        i.lineKey === keyOrId || i.productId === keyOrId || i.coffretId === keyOrId
          ? { ...i, quantity: Math.max(0, quantity) }
          : i
      )
      .filter((i) => i.quantity > 0);
    write(items);
    return items;
  }

  function remove(keyOrId) {
    write(
      read().filter(
        (i) => i.lineKey !== keyOrId && i.productId !== keyOrId && i.coffretId !== keyOrId
      )
    );
  }

  function clear() {
    write([]);
  }

  function count() {
    return read().reduce((n, i) => n + i.quantity, 0);
  }

  function total() {
    return read().reduce((n, i) => n + i.price * i.quantity, 0);
  }

  function formatPrice(n) {
    return `${Number(n).toLocaleString('fr-FR')} FCFA`;
  }

  function updateBadges() {
    const n = count();
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = String(n);
      el.hidden = n === 0;
    });
  }

  function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /** Répartition équilibrée des macajoux (sélection créatrice). */
  function buildTrustComposition(macajoux, capacity) {
    const list = Array.isArray(macajoux) ? macajoux.filter(Boolean) : [];
    const cap = Math.max(0, Number(capacity) || 0);
    if (!list.length || !cap) return [];
    const base = Math.floor(cap / list.length);
    let rem = cap % list.length;
    return list
      .map((m, i) => {
        const quantity = base + (i < rem ? 1 : 0);
        return {
          macajouId: String(m._id || m.id),
          name: m.name,
          image: m.image || '',
          quantity,
        };
      })
      .filter((c) => c.macajouId && c.quantity > 0);
  }

  function ensureAfterAddStyles() {
    if (document.getElementById('afterAddStyles')) return;
    const s = document.createElement('style');
    s.id = 'afterAddStyles';
    s.textContent = `
      .toast{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(20px);background:#1C1611;color:#FBF5E8;padding:.8rem 1.4rem;font-size:.85rem;opacity:0;pointer-events:none;transition:opacity .3s,transform .3s;z-index:450;letter-spacing:.04em;font-family:Jost,sans-serif}
      .toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
      .after-add{position:fixed;inset:0;z-index:400;background:rgba(28,22,17,.45);display:grid;place-items:center;padding:1.2rem;opacity:0;pointer-events:none;transition:opacity .25s}
      .after-add.show{opacity:1;pointer-events:auto}
      .after-add-card{background:#FBF5E8;border:1px solid rgba(28,22,17,.12);padding:2rem 1.6rem;max-width:420px;width:100%;text-align:center;color:#1C1611;font-family:Jost,sans-serif}
      .after-add-eyebrow{font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:#6E4118;margin-bottom:.55rem}
      .after-add-card h2{font-family:'Cormorant Garamond',serif;font-weight:500;font-size:1.65rem;text-transform:uppercase;letter-spacing:.03em;margin:0 0 .55rem}
      .after-add-lead{opacity:.75;line-height:1.5;margin:0 0 1.4rem;font-size:.95rem}
      .after-add-actions{display:flex;flex-direction:column;gap:.65rem}
      .after-add-actions a{display:inline-flex;align-items:center;justify-content:center;padding:.95rem 1.4rem;letter-spacing:.08em;text-transform:uppercase;font-size:.78rem;text-decoration:none;border:1px solid #1C1611;color:#1C1611;background:transparent}
      .after-add-actions a.primary{background:#B5121B;border-color:#B5121B;color:#FBF5E8}
      .after-add-close{margin-top:1rem;background:none;border:none;text-decoration:underline;cursor:pointer;font:inherit;opacity:.65;font-size:.88rem;color:inherit}
    `;
    document.head.appendChild(s);
  }

  function showAfterAddChoice() {
    ensureAfterAddStyles();
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
            <a href="/#collection">Continuer les achats</a>
            <a class="primary" href="/panier.html">Finaliser la commande</a>
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
    updateBadges();
  }

  let macajouxCache = null;
  async function loadMacajoux() {
    if (macajouxCache?.length) return macajouxCache;
    const res = await fetch('/api/macajoux');
    if (!res.ok) throw new Error('Impossible de charger les macajoux');
    macajouxCache = await res.json();
    if (!macajouxCache.length) throw new Error('Aucun macajou disponible pour le moment');
    return macajouxCache;
  }

  /** Ajoute la sélection créatrice puis ouvre la popup (sans passer par le compositeur). */
  async function trustAddCoffret(coffret) {
    const macajoux = await loadMacajoux();
    const composition = buildTrustComposition(macajoux, coffret.capacity);
    addCoffret(coffret, composition, 1);
    toast('Sélection de la créatrice ajoutée');
    showAfterAddChoice();
    return composition;
  }

  document.addEventListener('DOMContentLoaded', updateBadges);

  return {
    read,
    write,
    add,
    addCoffret,
    trustAddCoffret,
    buildTrustComposition,
    showAfterAddChoice,
    setQty,
    remove,
    clear,
    count,
    total,
    formatPrice,
    updateBadges,
    toast,
    lineKey,
    normalizeFlavors,
    normalizeComposition,
  };
})();

window.Cart = Cart;
