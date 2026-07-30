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
      items.push({
        type: 'product',
        productId: id,
        lineKey: key,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || product.image || '',
        quantity: qty,
        flavors,
        category: product.category || '',
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
        image: coffret.image || coffret.images?.[0] || '',
        quantity: qty,
        capacity,
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

  document.addEventListener('DOMContentLoaded', updateBadges);

  return {
    read,
    write,
    add,
    addCoffret,
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
