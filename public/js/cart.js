const Cart = (() => {
  const KEY = 'macajou_cart';

  function normalizeFlavors(flavors) {
    if (!Array.isArray(flavors)) return [];
    return [...new Set(flavors.map((f) => String(f || '').trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'fr')
    );
  }

  function lineKey(productId, flavors) {
    const f = normalizeFlavors(flavors);
    return f.length ? `${productId}::${f.join('|')}` : String(productId);
  }

  function read() {
    try {
      const items = JSON.parse(localStorage.getItem(KEY) || '[]');
      return items.map((i) => ({
        ...i,
        flavors: normalizeFlavors(i.flavors),
        lineKey: i.lineKey || lineKey(i.productId, i.flavors),
      }));
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
    const key = lineKey(id, flavors);
    const existing = items.find((i) => i.lineKey === key);
    if (existing) existing.quantity += qty;
    else {
      items.push({
        productId: id,
        lineKey: key,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || '',
        quantity: qty,
        flavors,
        category: product.category || '',
      });
    }
    write(items);
    return items;
  }

  function setQty(keyOrId, quantity) {
    let items = read();
    items = items
      .map((i) =>
        i.lineKey === keyOrId || i.productId === keyOrId
          ? { ...i, quantity: Math.max(0, quantity) }
          : i
      )
      .filter((i) => i.quantity > 0);
    write(items);
    return items;
  }

  function remove(keyOrId) {
    write(read().filter((i) => i.lineKey !== keyOrId && i.productId !== keyOrId));
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

  document.addEventListener('DOMContentLoaded', updateBadges);

  return {
    read,
    write,
    add,
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
  };
})();

window.Cart = Cart;
