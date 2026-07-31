/** Applique les textes éditables du dashboard (data-content). */
(function () {
  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function applyValue(el, value) {
    if (value === undefined || value === null) return;
    const text = String(value);
    const mode = el.getAttribute('data-content-type') || 'text';

    if (mode === 'placeholder') {
      el.setAttribute('placeholder', text);
      el.setAttribute('aria-label', text);
      return;
    }

    if (mode === 'html-br' || text.includes('\n')) {
      const parts = escapeHtml(text).split('\n');
      const key = el.getAttribute('data-content') || '';
      if (key === 'annonce.text' && parts.length > 1) {
        el.innerHTML =
          parts[0] +
          '<br><em class="annonce-note">' +
          parts.slice(1).join(' ') +
          '</em>';
        return;
      }
      el.innerHTML = parts.join('<br>');
      return;
    }

    el.textContent = text;
  }

  function applyMap(map) {
    if (!map) return;
    document.querySelectorAll('[data-content]').forEach((el) => {
      applyValue(el, map[el.getAttribute('data-content')]);
    });
  }

  async function load() {
    try {
      const res = await fetch('/api/site-content/map');
      if (!res.ok) return;
      applyMap(await res.json());
    } catch (err) {
      console.warn('Textes site:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
