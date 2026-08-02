/** Club Macajou — page dédiée, popups landing, notifications, RSVP */
(function () {
  const SEEN_KEY = 'macajou_club_seen';
  const NOTIF_KEY = 'macajou_notif_choice';
  const isClubPage = !!document.getElementById('clubFeed');

  const TYPE_LABEL = {
    event: 'Événement',
    coming_soon: 'Coming soon',
    news: 'Actualité',
  };

  let pendingPopupPosts = [];

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function formatBody(text) {
    const html = esc(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    if (!html) return '';
    return html
      .split(/<br>/)
      .filter(Boolean)
      .map((p) => `<p>${p}</p>`)
      .join('');
  }

  function formatDate(d) {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  function getSeen() {
    try {
      return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function markSeen(id) {
    const seen = getSeen();
    if (!seen.includes(id)) {
      seen.push(id);
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    }
  }

  function observeReveals(root) {
    if (!root) return;
    const nodes = root.querySelectorAll('.reveal:not(.in)');
    if (!window.IntersectionObserver) {
      nodes.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    nodes.forEach((el) => io.observe(el));
  }

  function eventEntryHtml(p, index) {
    const flip = index % 2 === 1 ? ' is-flip' : '';
    const visu = p.image
      ? `<div class="club-entry-img"><img src="${esc(p.image)}" alt="" loading="lazy"></div>`
      : `<div class="club-entry-img is-empty">Macajou</div>`;
    const meta = [formatDate(p.eventDate), p.eventLocation].filter(Boolean).join(' · ');
    return `<article class="club-entry reveal${flip}" data-id="${esc(p._id)}" data-type="event">
      <div class="club-entry-visu">${visu}</div>
      <div class="club-entry-texte">
        <span class="club-entry-tag">${esc(TYPE_LABEL.event)}</span>
        <h3>${esc(p.title)}</h3>
        ${meta ? `<p class="club-entry-meta">${esc(meta)}</p>` : ''}
        <div class="club-entry-body">${formatBody(p.body || p.excerpt)}</div>
        <button type="button" class="club-entry-cta club-card-rsvp" data-id="${esc(p._id)}">Confirmer ma présence</button>
      </div>
    </article>`;
  }

  function rowItemHtml(p, kind) {
    const thumb = p.image
      ? `<div class="club-${kind}-thumb"><img src="${esc(p.image)}" alt="" loading="lazy"></div>`
      : `<div class="club-${kind}-thumb is-empty">Macajou</div>`;
    return `<article class="club-${kind}-item reveal" data-id="${esc(p._id)}" data-type="${esc(p.type)}">
      ${thumb}
      <div class="club-${kind}-copy">
        <span class="club-entry-tag">${esc(TYPE_LABEL[p.type] || p.type)}</span>
        <h3>${esc(p.title)}</h3>
        <div class="club-entry-body">${formatBody(p.body || p.excerpt)}</div>
      </div>
    </article>`;
  }

  function popupCardHtml(p) {
    const isEvent = p.type === 'event';
    const cta = isEvent ? 'Confirmer ma présence' : 'Voir le club';
    const ctaClass = isEvent ? 'club-card-cta club-card-rsvp' : 'club-card-cta club-card-more';
    return `<article class="club-card club-popup-card" data-id="${esc(p._id)}" data-type="${esc(p.type)}">
      ${p.image ? `<div class="club-card-img"><img src="${esc(p.image)}" alt="" loading="lazy"></div>` : ''}
      <div class="club-card-body">
        <span class="club-tag club-tag-${esc(p.type)}">${esc(TYPE_LABEL[p.type] || p.type)}</span>
        <h3>${esc(p.title)}</h3>
        ${p.eventDate ? `<p class="club-date">${esc(formatDate(p.eventDate))}${p.eventLocation ? ` · ${esc(p.eventLocation)}` : ''}</p>` : ''}
        <div class="club-excerpt">${esc(p.excerpt || p.body).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</div>
        <button type="button" class="${ctaClass}" data-id="${esc(p._id)}">${cta}</button>
      </div>
    </article>`;
  }

  function renderClubPage(posts) {
    const feed = document.getElementById('clubFeed');
    const anchors = document.getElementById('clubAnchors');
    if (!feed) return;

    if (!posts.length) {
      feed.innerHTML = `<div class="club-empty reveal"><span>Le club se prépare</span>Aucun événement ni nouveauté pour le moment. Revenez bientôt.</div>`;
      if (anchors) anchors.hidden = true;
      observeReveals(feed);
      return;
    }

    const events = posts.filter((p) => p.type === 'event');
    const soon = posts.filter((p) => p.type === 'coming_soon');
    const news = posts.filter((p) => p.type === 'news');

    if (anchors) {
      anchors.hidden = false;
      anchors.querySelectorAll('a').forEach((a) => {
        const id = a.getAttribute('href')?.slice(1);
        const map = { 'club-events': events, 'club-coming': soon, 'club-news': news };
        a.hidden = !(map[id] && map[id].length);
      });
    }

    let html = '';
    if (events.length) {
      html += `<section class="club-group" id="club-events">
        <div class="club-group-head reveal">
          <h2>Événements</h2>
          <p>Rencontres, dégustations et soirées de la Maison Macajou.</p>
        </div>
        ${events.map((p, i) => eventEntryHtml(p, i)).join('')}
      </section>`;
    }
    if (soon.length) {
      html += `<section class="club-group" id="club-coming">
        <div class="club-group-head reveal">
          <h2>Coming soon</h2>
          <p>Les créations et parfums qui arrivent bientôt.</p>
        </div>
        <div class="club-soon-list">${soon.map((p) => rowItemHtml(p, 'soon')).join('')}</div>
      </section>`;
    }
    if (news.length) {
      html += `<section class="club-group" id="club-news">
        <div class="club-group-head reveal">
          <h2>Actualités</h2>
          <p>Les nouvelles de la communauté gourmande.</p>
        </div>
        <div class="club-news-list">${news.map((p) => rowItemHtml(p, 'news')).join('')}</div>
      </section>`;
    }

    feed.innerHTML = html;
    observeReveals(feed);
  }

  function openRsvp(postId, title) {
    const dlg = document.getElementById('clubRsvpDialog');
    if (!dlg) return;
    document.getElementById('clubRsvpPostId').value = postId;
    document.getElementById('clubRsvpTitle').textContent = title || 'Confirmer ma présence';
    document.getElementById('clubRsvpError').hidden = true;
    document.getElementById('clubRsvpForm').reset();
    dlg.showModal();
  }

  async function submitRsvp(e) {
    e.preventDefault();
    const errEl = document.getElementById('clubRsvpError');
    errEl.hidden = true;
    const id = document.getElementById('clubRsvpPostId').value;
    const body = {
      firstName: document.getElementById('clubRsvpFirst').value.trim(),
      lastName: document.getElementById('clubRsvpLast').value.trim(),
      email: document.getElementById('clubRsvpEmail').value.trim(),
      phone: document.getElementById('clubRsvpPhone').value.trim(),
    };
    try {
      const res = await fetch(`/api/club/${encodeURIComponent(id)}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Envoi impossible');
      document.getElementById('clubRsvpDialog').close();
      markSeen(id);
      alert('Merci ! Votre présence est enregistrée. Nous vous recontacterons bientôt.');
    } catch (err) {
      errEl.hidden = false;
      errEl.textContent = err.message;
    }
  }

  function sendBrowserNotifications(posts) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    posts.slice(0, 2).forEach((p) => {
      try {
        new Notification('Macajou Club', {
          body: p.excerpt || p.title,
          icon: '/assets/logo-macajou.png',
        });
      } catch (_) {}
    });
  }

  function showPopup(posts) {
    const overlay = document.getElementById('clubPopup');
    const list = document.getElementById('clubPopupList');
    if (!overlay || !list || !posts.length) return;
    list.innerHTML = posts.map((p) => popupCardHtml(p)).join('');
    overlay.hidden = false;
    document.body.classList.add('club-popup-open');
    sendBrowserNotifications(posts);
  }

  function hidePopup(markSeenAll) {
    const overlay = document.getElementById('clubPopup');
    if (!overlay) return;
    if (markSeenAll) {
      const ids = [
        ...new Set(
          [...overlay.querySelectorAll('.club-popup-card[data-id]')].map((el) => el.dataset.id)
        ),
      ];
      ids.forEach(markSeen);
    }
    overlay.hidden = true;
    document.body.classList.remove('club-popup-open');
    pendingPopupPosts = [];
  }

  function maybeShowPendingPopup() {
    if (!pendingPopupPosts.length) return;
    const posts = pendingPopupPosts.slice();
    pendingPopupPosts = [];
    showPopup(posts);
  }

  function askNotificationsThenPopup() {
    const banner = document.getElementById('clubNotifAsk');
    const alreadyAsked = !!localStorage.getItem(NOTIF_KEY);
    const notifSupported = 'Notification' in window;

    if (
      alreadyAsked ||
      !notifSupported ||
      Notification.permission === 'granted' ||
      Notification.permission === 'denied'
    ) {
      if (!alreadyAsked && notifSupported && Notification.permission !== 'default') {
        localStorage.setItem(NOTIF_KEY, Notification.permission === 'granted' ? 'yes' : 'no');
      }
      maybeShowPendingPopup();
      return;
    }

    if (!banner) {
      maybeShowPendingPopup();
      return;
    }
    banner.hidden = false;
  }

  function wireNotifBanner() {
    const banner = document.getElementById('clubNotifAsk');
    if (!banner) return;
    banner.querySelector('[data-notif-yes]')?.addEventListener('click', async () => {
      localStorage.setItem(NOTIF_KEY, 'yes');
      banner.hidden = true;
      try {
        if ('Notification' in window) await Notification.requestPermission();
      } catch (_) {}
      maybeShowPendingPopup();
    });
    banner.querySelector('[data-notif-no]')?.addEventListener('click', () => {
      localStorage.setItem(NOTIF_KEY, 'no');
      banner.hidden = true;
      maybeShowPendingPopup();
    });
  }

  function wirePopup() {
    const overlay = document.getElementById('clubPopup');
    if (!overlay) return;
    overlay.querySelector('[data-popup-close]')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hidePopup(true);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hidePopup(true);
    });
    overlay.addEventListener('click', (e) => {
      const rsvp = e.target.closest('.club-card-rsvp');
      const more = e.target.closest('.club-card-more');
      const card = e.target.closest('.club-popup-card');
      if (!card) return;
      const id = card.dataset.id;
      const title = card.querySelector('h3')?.textContent || '';
      if (rsvp) {
        markSeen(id);
        hidePopup(false);
        openRsvp(id, title);
        return;
      }
      if (more) {
        markSeen(id);
        hidePopup(false);
        window.location.href = '/club.html';
      }
    });
  }

  function wireFeed() {
    const feed = document.getElementById('clubFeed');
    if (!feed) return;
    feed.addEventListener('click', (e) => {
      const btn = e.target.closest('.club-card-rsvp');
      if (!btn) return;
      const card = btn.closest('[data-id]');
      openRsvp(btn.dataset.id || card?.dataset.id, card?.querySelector('h3')?.textContent || '');
    });
  }

  async function load() {
    try {
      const res = await fetch('/api/club');
      if (!res.ok) return;
      const posts = await res.json();
      if (isClubPage) renderClubPage(posts);

      // Popups / notifs : uniquement sur la landing (pas sur /club.html)
      if (isClubPage) return;

      const seen = getSeen();
      const popupRes = await fetch('/api/club/popup');
      if (!popupRes.ok) return;
      pendingPopupPosts = (await popupRes.json()).filter((p) => !seen.includes(p._id));
      setTimeout(askNotificationsThenPopup, 900);
    } catch (err) {
      console.warn('Club Macajou:', err);
    }
  }

  function init() {
    wireNotifBanner();
    wirePopup();
    wireFeed();
    document.getElementById('clubRsvpForm')?.addEventListener('submit', submitRsvp);
    document.getElementById('clubRsvpCancel')?.addEventListener('click', () =>
      document.getElementById('clubRsvpDialog')?.close()
    );
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
