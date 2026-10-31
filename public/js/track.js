/* Macajou · suivi des visites (anonyme, sans cookie tiers).
   Enregistre : pages vues, coffret consulté, ajout au panier, passage en caisse, clic WhatsApp.
   Origine du visiteur : paramètres UTM / fbclid / ttclid, sinon site référent, sinon navigateur intégré
   (Instagram, Facebook, TikTok), sinon « direct ». Les données alimentent l'onglet Analytics du dashboard. */
(function () {
  'use strict';
  try {
    if (window.MJTrack) return;
    var path = location.pathname;
    var noop = { event: function () {}, context: function () { return {}; } };
    var off = false;
    try { off = localStorage.getItem('mj_notrack') === '1'; } catch (e) {}
    if (off || /^\/dashboard/.test(path) || navigator.doNotTrack === '1' || window.doNotTrack === '1') {
      window.MJTrack = noop;
      return;
    }

    var SESSION_MS = 30 * 60 * 1000;
    function rnd() {
      var a = new Uint8Array(8);
      (window.crypto || window.msCrypto).getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    }
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

    var vid = get('mj_vid');
    if (!vid) { vid = rnd(); set('mj_vid', vid); }

    /* ---------- Origine ---------- */
    var q = new URLSearchParams(location.search);
    var ua = navigator.userAgent || '';
    function norm(s) {
      s = String(s || '').toLowerCase();
      if (/(^|[^a-z])(fb|facebook|meta)/.test(s)) return 'facebook';
      if (/(^|[^a-z])(ig|instagram)/.test(s)) return 'instagram';
      if (/(^|[^a-z])(tt|tiktok)/.test(s)) return 'tiktok';
      if (/whatsapp|(^|[^a-z])wa([^a-z]|$)/.test(s)) return 'whatsapp';
      if (/google|adwords|gads/.test(s)) return 'google';
      if (/youtube|(^|[^a-z])yt([^a-z]|$)/.test(s)) return 'youtube';
      if (/mail|newsletter|brevo|sendinblue/.test(s)) return 'email';
      return s ? 'autre' : '';
    }
    function fromHost(h) {
      h = String(h || '').toLowerCase().replace(/^www\./, '');
      if (!h) return '';
      if (/(^|\.)(facebook|fb|messenger)\.(com|me)$|(^|\.)fb\.watch$/.test(h)) return 'facebook';
      if (/(^|\.)instagram\.com$/.test(h)) return 'instagram';
      if (/(^|\.)tiktok\.com$/.test(h)) return 'tiktok';
      if (/(^|\.)(wa\.me|whatsapp\.com)$/.test(h)) return 'whatsapp';
      if (/(^|\.)google\.[a-z.]+$/.test(h)) return 'google';
      if (/(^|\.)(youtube\.com|youtu\.be)$/.test(h)) return 'youtube';
      return 'autre';
    }
    function attribution() {
      var a = { source: '', medium: '', campaign: q.get('utm_campaign') || '', content: q.get('utm_content') || '', referrer: '' };
      var utm = q.get('utm_source');
      if (utm) { a.source = norm(utm); a.medium = (q.get('utm_medium') || '').toLowerCase(); }
      else if (q.get('fbclid')) { a.source = 'facebook'; a.medium = 'social'; }
      else if (q.get('ttclid')) { a.source = 'tiktok'; a.medium = 'social'; }
      else if (q.get('igshid')) { a.source = 'instagram'; a.medium = 'social'; }
      else if (q.get('gclid')) { a.source = 'google'; a.medium = 'cpc'; }
      var host = '';
      try { host = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
      if (host && host !== location.hostname) a.referrer = host.replace(/^www\./, '');
      if (!a.source && a.referrer) {
        a.source = fromHost(a.referrer);
        a.medium = a.source === 'google' ? 'organic' : /facebook|instagram|tiktok|whatsapp|youtube/.test(a.source) ? 'social' : 'referral';
      }
      if (!a.source) {
        // Navigateurs intégrés : le site référent est souvent masqué
        if (/Instagram/i.test(ua)) { a.source = 'instagram'; a.medium = 'social'; }
        else if (/FBAN|FBAV|FB_IAB/i.test(ua)) { a.source = 'facebook'; a.medium = 'social'; }
        else if (/musical_ly|TikTok|Bytedance/i.test(ua)) { a.source = 'tiktok'; a.medium = 'social'; }
        else a.source = 'direct';
      }
      return a;
    }
    function device() {
      if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet';
      if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) return 'mobile';
      return 'desktop';
    }

    /* ---------- Session (30 min d'inactivité ou nouvelle campagne) ---------- */
    var now = Date.now();
    var sess = null;
    try { sess = JSON.parse(get('mj_sess') || 'null'); } catch (e) {}
    var campaignParams = q.get('utm_source') || q.get('fbclid') || q.get('ttclid') || q.get('igshid') || q.get('gclid');
    var fresh = !sess || !sess.id || now - sess.last > SESSION_MS;
    if (!fresh && campaignParams) {
      var na = attribution();
      if (na.source !== sess.source || na.campaign !== sess.campaign) fresh = true;
    }
    if (fresh) {
      var at = attribution();
      sess = { id: rnd(), last: now, source: at.source, medium: at.medium, campaign: at.campaign, content: at.content, referrer: at.referrer, landing: path, device: device() };
    }
    sess.last = now;
    set('mj_sess', JSON.stringify(sess));

    function context() {
      return { vid: vid, sid: sess.id, source: sess.source, medium: sess.medium, campaign: sess.campaign, content: sess.content, referrer: sess.referrer, landing: sess.landing, device: sess.device };
    }

    /* ---------- Envoi ---------- */
    var queue = [];
    var timer = null;
    function flush() {
      timer = null;
      if (!queue.length) return;
      var body = JSON.stringify({ events: queue.splice(0, 10) });
      try {
        if (navigator.sendBeacon && navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))) return;
      } catch (e) {}
      try { fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }); } catch (e) {}
    }
    function event(type, data) {
      try {
        sess.last = Date.now();
        set('mj_sess', JSON.stringify(sess));
        var ev = context();
        ev.type = type;
        ev.path = path;
        if (data) for (var k in data) ev[k] = data[k];
        queue.push(ev);
        if (queue.length >= 10) flush();
        else if (!timer) timer = setTimeout(flush, 800);
      } catch (e) {}
    }
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });

    /* Clics WhatsApp (liens ajoutés dynamiquement : délégation) */
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href*="wa.me"], a[href*="whatsapp.com"]') : null;
      if (a) event('whatsapp_click', { itemName: (a.textContent || '').trim().slice(0, 60) });
    }, true);

    window.MJTrack = { event: event, context: context };
    event('pageview');
  } catch (err) {
    window.MJTrack = window.MJTrack || { event: function () {}, context: function () { return {}; } };
  }
})();
