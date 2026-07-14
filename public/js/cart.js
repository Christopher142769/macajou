const Cart = (() => {
  const KEY = 'macajou_cart';

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  }

  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('macajou:cart', { detail: items }));
    updateBadges();
  }

  function add(product, qty = 1) {
    const items = read();
    const id = product._id || product.id;
    const existing = items.find((i) => i.productId === id);
    if (existing) existing.quantity += qty;
    else {
      items.push({
        productId: id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || '',
        quantity: qty,
      });
    }
    write(items);
    return items;
  }

  function setQty(productId, quantity) {
    let items = read();
    items = items
      .map((i) => (i.productId === productId ? { ...i, quantity: Math.max(0, quantity) } : i))
      .filter((i) => i.quantity > 0);
    write(items);
    return items;
  }

  function remove(productId) {
    write(read().filter((i) => i.productId !== productId));
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

  return { read, write, add, setQty, remove, clear, count, total, formatPrice, updateBadges, toast };
})();

window.Cart = Cart;
