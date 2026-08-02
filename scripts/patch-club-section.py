#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'public/index.html'

CLUB_CSS = """
/* ================= CLUB MACAJOU ================= */
.club-sec{position:relative;background:linear-gradient(165deg,var(--encre) 0%,#2a2218 42%,var(--encre) 100%);color:var(--creme);padding:8rem 2.4rem 7rem;overflow:hidden}
.club-sec::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 18% 12%,rgba(255,222,143,.14),transparent 42%),radial-gradient(circle at 82% 88%,rgba(181,18,27,.2),transparent 45%);pointer-events:none}
.club-inner{position:relative;z-index:1;max-width:1280px;margin:auto}
.club-head{text-align:center;max-width:820px;margin:0 auto 4.5rem}
.club-sec .sec-sur{color:var(--beurre);margin-bottom:.9rem}
.club-main-title{font-family:var(--script);font-weight:400;font-size:clamp(2.6rem,6.5vw,5.2rem);line-height:1.12;color:var(--creme)}
.club-sub{font-family:var(--display);font-size:clamp(1rem,1.8vw,1.25rem);opacity:.82;margin-top:1.2rem;line-height:1.55;letter-spacing:.04em}
.club-rule{width:0;height:1px;background:var(--beurre);margin:2rem auto 0;transition:width 1.2s .2s cubic-bezier(.2,.7,.2,1)}
.club-rule.in{width:140px}
.club-group{margin-bottom:4rem}
.club-group-title{font-family:var(--display);font-weight:500;text-transform:uppercase;letter-spacing:.14em;font-size:clamp(1.1rem,2vw,1.45rem);margin-bottom:1.8rem;padding-bottom:.75rem;border-bottom:1px solid rgba(251,245,232,.15)}
.club-group-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.6rem}
.club-card{background:rgba(251,245,232,.06);border:1px solid rgba(251,245,232,.12);overflow:hidden;display:flex;flex-direction:column;transition:transform .45s cubic-bezier(.2,.7,.2,1),box-shadow .45s,border-color .45s}
.club-card:hover{transform:translateY(-6px);box-shadow:0 28px 50px rgba(0,0,0,.35);border-color:rgba(255,222,143,.35)}
.club-card-img{aspect-ratio:16/10;overflow:hidden;background:#000}
.club-card-img img{width:100%;height:100%;object-fit:cover;transition:transform 1s cubic-bezier(.2,.7,.2,1)}
.club-card:hover .club-card-img img{transform:scale(1.06)}
.club-card-body{padding:1.35rem 1.3rem 1.5rem;display:flex;flex-direction:column;gap:.55rem;flex:1}
.club-tag{align-self:flex-start;font-size:.65rem;letter-spacing:.16em;text-transform:uppercase;padding:.28rem .65rem;border:1px solid rgba(255,222,143,.45);color:var(--beurre)}
.club-tag-event{background:rgba(181,18,27,.25);border-color:rgba(181,18,27,.5)}
.club-tag-coming_soon{background:rgba(255,222,143,.12)}
.club-card h3{font-family:var(--display);font-weight:500;font-size:1.35rem;line-height:1.25}
.club-date{font-size:.82rem;opacity:.75;letter-spacing:.03em}
.club-excerpt{font-size:.92rem;opacity:.88;line-height:1.6}
.club-excerpt strong,.club-full strong{font-weight:500;color:var(--beurre)}
.club-full{font-size:.88rem;opacity:.72;line-height:1.55;margin-top:.35rem;display:none}
.club-card-cta{margin-top:auto;align-self:flex-start;font-family:var(--display);font-style:italic;font-size:1rem;border:1px solid var(--beurre);background:transparent;color:var(--creme);padding:.65rem 1.4rem;cursor:pointer;transition:background .35s,color .35s}
.club-card-cta:hover{background:var(--beurre);color:var(--encre)}
.club-empty{text-align:center;opacity:.7;font-family:var(--display);font-size:1.2rem;padding:3rem 1rem}
.club-notif-ask{position:fixed;bottom:1.2rem;left:50%;transform:translateX(-50%);z-index:2500;width:min(520px,calc(100% - 2rem));background:var(--encre);color:var(--creme);border:1px solid rgba(255,222,143,.35);padding:1.1rem 1.2rem;box-shadow:0 24px 60px rgba(0,0,0,.45);display:flex;flex-wrap:wrap;align-items:center;gap:.8rem 1rem}
.club-notif-ask p{flex:1;min-width:200px;font-size:.88rem;line-height:1.45;margin:0}
.club-notif-actions{display:flex;gap:.5rem;flex-wrap:wrap}
.club-notif-actions button{font-family:var(--display);font-size:.9rem;padding:.5rem 1rem;cursor:pointer;border:1px solid var(--beurre);background:transparent;color:var(--creme)}
.club-notif-actions button[data-notif-yes]{background:var(--beurre);color:var(--encre);border-color:var(--beurre)}
.club-popup{position:fixed;inset:0;z-index:2400;background:rgba(28,22,17,.72);backdrop-filter:blur(8px);display:grid;place-items:center;padding:1.5rem;overflow-y:auto}
.club-popup-panel{width:min(920px,100%);max-height:min(88vh,900px);overflow-y:auto;background:var(--creme);color:var(--encre);padding:2rem 1.8rem 1.6rem;position:relative;box-shadow:0 40px 90px rgba(0,0,0,.45)}
.club-popup-head{text-align:center;margin-bottom:1.6rem}
.club-popup-head h2{font-family:var(--script);font-size:clamp(1.8rem,4vw,2.8rem);line-height:1.15}
.club-popup-head p{font-size:.88rem;opacity:.7;margin-top:.5rem}
.club-popup-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.2rem}
.club-popup-list .club-card{background:#fff;border-color:rgba(28,22,17,.1);color:var(--encre)}
.club-popup-list .club-card-cta{border-color:var(--encre);color:var(--encre)}
.club-popup-list .club-card-cta:hover{background:var(--encre);color:var(--creme)}
.club-popup-close{position:absolute;top:.8rem;right:.8rem;background:none;border:none;font-size:1.3rem;cursor:pointer;opacity:.6;color:var(--encre)}
.club-popup-close:hover{opacity:1}
body.club-popup-open{overflow:hidden}
#clubRsvpDialog{border:none;border-radius:0;padding:0;max-width:480px;width:calc(100% - 2rem);background:var(--creme);color:var(--encre)}
#clubRsvpDialog::backdrop{background:rgba(28,22,17,.55)}
.club-rsvp-form{padding:1.8rem 1.6rem 1.5rem}
.club-rsvp-form h3{font-family:var(--display);font-size:1.45rem;margin-bottom:1.2rem}
.club-rsvp-form label{display:block;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;margin-bottom:.35rem;opacity:.75}
.club-rsvp-form input{width:100%;border:none;border-bottom:1px solid rgba(28,22,17,.2);background:transparent;padding:.55rem 0 .45rem;font-family:var(--body);font-size:.95rem;margin-bottom:1rem;outline:none}
.club-rsvp-actions{display:flex;gap:.6rem;justify-content:flex-end;margin-top:.5rem}
.club-rsvp-actions button{font-family:var(--display);padding:.65rem 1.3rem;cursor:pointer;border:1px solid var(--encre);background:transparent}
.club-rsvp-actions button[type=submit]{background:var(--encre);color:var(--creme)}
.club-rsvp-err{color:var(--rouge);font-size:.85rem;margin-top:.5rem}
@media(max-width:700px){
  .club-sec{padding:5.5rem 1.2rem 4.5rem}
  .club-group-grid,.club-popup-list{grid-template-columns:1fr}
  .club-notif-ask{flex-direction:column;align-items:stretch}
}
"""

CLUB_SECTION = """
<!-- CLUB MACAJOU -->
<section class="club-sec" id="club">
  <div class="club-inner">
    <div class="club-head">
      <span class="sec-sur reveal">Communauté gourmande</span>
      <h2 class="club-main-title reveal d1">Bienvenue dans<br>le club Macajou</h2>
      <p class="club-sub reveal d2">Événements exclusifs, produits à venir et actualités de la Maison. Rejoignez le cercle des gourmets.</p>
      <div class="club-rule reveal d2" aria-hidden="true"></div>
    </div>
    <div id="clubGrid" class="club-grid" aria-live="polite"></div>
  </div>
</section>
"""

POPUPS = """
<!-- Club : demande notifications -->
<div id="clubNotifAsk" class="club-notif-ask" hidden>
  <p>Autorisez les notifications Macajou pour être alerté des événements du club sur votre téléphone ou ordinateur.</p>
  <div class="club-notif-actions">
    <button type="button" data-notif-yes">Autoriser</button>
    <button type="button" data-notif-no">Plus tard</button>
  </div>
</div>

<!-- Club : popups actualités -->
<div id="clubPopup" class="club-popup" hidden>
  <div class="club-popup-panel">
    <button type="button" class="club-popup-close" data-popup-close aria-label="Fermer">✕</button>
    <div class="club-popup-head">
      <h2>Nouveautés du club</h2>
      <p>Événements, coming soon et actualités Macajou</p>
    </div>
    <div id="clubPopupList" class="club-popup-list"></div>
  </div>
</div>

<dialog id="clubRsvpDialog">
  <form id="clubRsvpForm" class="club-rsvp-form">
    <input type="hidden" id="clubRsvpPostId">
    <h3 id="clubRsvpTitle">Confirmer ma présence</h3>
    <div><label for="clubRsvpFirst">Prénom</label><input id="clubRsvpFirst" required autocomplete="given-name"></div>
    <div><label for="clubRsvpLast">Nom</label><input id="clubRsvpLast" required autocomplete="family-name"></div>
    <div><label for="clubRsvpEmail">E-mail</label><input id="clubRsvpEmail" type="email" required autocomplete="email"></div>
    <div><label for="clubRsvpPhone">Téléphone</label><input id="clubRsvpPhone" type="tel" required autocomplete="tel"></div>
    <p id="clubRsvpError" class="club-rsvp-err" hidden></p>
    <div class="club-rsvp-actions">
      <button type="button" id="clubRsvpCancel">Annuler</button>
      <button type="submit">Confirmer</button>
    </div>
  </form>
</dialog>
"""


def main():
    t = INDEX.read_text()

    # CSS: replace coffret-sec block
    cstart = t.index('/* ================= COFFRET SUR MESURE ================= */')
    cend = t.index('/* ================= IDÉES CADEAUX ================= */')
    t = t[:cstart] + '/* ================= CLUB MACAJOU (styles) ================= */' + CLUB_CSS + t[cend:]

    # Section: replace coffret-sec
    sstart = t.index('<section class="coffret-sec"')
    send = t.index('</section>', sstart) + len('</section>')
    t = t[:sstart] + CLUB_SECTION.strip() + t[send:]

    # Nav links
    t = t.replace('href="#coffret">Le Club Macajou', 'href="#club">Le Club Macajou')
    t = t.replace('<a href="#coffret">Le Club Macajou', '<a href="#club">Le Club Macajou')

    # Remove account icon
    import re
    t = re.sub(
        r'\s*<a class="nav-ic" href="#" aria-label="Mon compte">\s*<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1\.4"><circle cx="12" cy="8" r="4"/><path d="M4 21c1\.5-4 5-6 8-6s6\.5 2 8 6"/></svg>\s*</a>',
        '',
        t,
        count=1,
    )

    # Footer link
    t = t.replace('href="#coffret">Coffrets sur mesure', 'href="#club">Le Club Macajou')

    # Popups before footer
    if 'id="clubPopup"' not in t:
        t = t.replace('<!-- FOOTER -->', POPUPS + '\n<!-- FOOTER -->')

    # Script
    if 'club.js' not in t:
        t = t.replace(
            '<script src="/js/landing.js',
            '<script src="/js/club.js?v=20260802-club"></script>\n<script src="/js/landing.js',
        )

    # club-rule animation like hist-rule
    if '.club-rule.in' not in t:
        pass  # already in CSS

    INDEX.write_text(t)
    print('index.html club patch OK')


if __name__ == '__main__':
    main()
