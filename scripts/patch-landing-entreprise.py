#!/usr/bin/env python3
"""Patch landing: mast, histoire, entreprise, annonce, sans tirets visibles."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "public/index.html"

HISTOIRE_CSS = """
/* ================= LA MAISON : L'HISTOIRE ================= */
.histoire{position:relative;background:linear-gradient(180deg,var(--creme) 0,var(--creme-2) 58%,var(--creme) 100%);padding:7.5rem 2.4rem 6.5rem;overflow:hidden}
.histoire::before{content:"";position:absolute;top:-160px;right:-160px;width:520px;height:520px;background:radial-gradient(circle,rgba(255,222,143,.5),transparent 66%);pointer-events:none}
.histoire::after{content:"";position:absolute;bottom:-200px;left:-180px;width:480px;height:480px;background:radial-gradient(circle,rgba(181,18,27,.09),transparent 68%);pointer-events:none}
.hist-wrap{position:relative;z-index:1;max-width:1360px;margin:auto}
.hist-head{text-align:center;max-width:min(820px,100%);margin:auto}
.hist-title{font-family:var(--script);font-weight:400;text-transform:none;letter-spacing:0;font-size:clamp(2.3rem,5vw,4rem);line-height:1.22;margin-top:.7rem;color:#1C1611}
.hist-rule{width:0;height:1px;background:var(--rouge);margin:2.2rem auto 0;transform:none;transition:width 1.2s .3s cubic-bezier(.2,.7,.2,1),opacity .8s}
.hist-rule.in{width:120px}
.hist-grid{display:grid;grid-template-columns:1fr 1.05fr;gap:clamp(2.6rem,5vw,5.5rem);align-items:center;margin-top:4.8rem}
.hist-visu{position:relative;padding-bottom:5.5rem}
.hist-img{overflow:hidden;background:var(--encre);margin:0}
.hist-img img{width:100%;height:100%;object-fit:cover;transition:transform 1.6s cubic-bezier(.2,.7,.2,1)}
.hist-img:hover img{transform:scale(1.06)}
.hist-img-main{aspect-ratio:4/5;box-shadow:0 44px 80px rgba(28,22,17,.2)}
.hist-img-sub{position:absolute;right:-6%;bottom:0;width:52%;aspect-ratio:1;border:10px solid var(--creme);box-shadow:0 26px 48px rgba(28,22,17,.22)}
.hist-stamp{position:absolute;left:-10px;top:-28px;z-index:2;font-family:var(--script);font-size:1.5rem;line-height:1.2;text-align:center;background:var(--beurre);padding:.6rem 1.3rem;box-shadow:0 14px 28px rgba(28,22,17,.18)}
.hist-texte p{font-size:1.03rem;color:#40372c;max-width:54ch}
.hist-texte p+p{margin-top:1.3rem}
.hist-lead::first-letter{float:left;font-family:var(--display);font-size:4.3rem;line-height:.78;padding:.1em .14em 0 0;color:var(--rouge)}
.hist-accent{font-family:var(--display);font-style:italic;color:var(--encre)!important;font-size:clamp(1.25rem,2vw,1.62rem);line-height:1.38;border-left:2px solid var(--rouge);padding-left:1.15rem;margin:1.9rem 0!important}
.hist-route{list-style:none;display:grid;grid-template-columns:repeat(4,1fr);gap:1.4rem;margin-top:5.4rem;position:relative}
.hist-route::before{content:"";position:absolute;top:14px;left:10%;right:10%;height:1px;background-image:linear-gradient(to right,rgba(28,22,17,.5) 42%,transparent 0);background-size:9px 1px}
.hist-route li{text-align:center}
.hist-route .dot{display:block;width:11px;height:11px;border-radius:50%;background:var(--creme);border:1px solid var(--encre);margin:9px auto 1.1rem;position:relative;z-index:1}
.hist-route li:last-child .dot{background:var(--rouge);border-color:var(--rouge);box-shadow:0 0 0 6px rgba(181,18,27,.14)}
.hist-route b{display:block;font-family:var(--display);font-weight:500;font-size:1.08rem;text-transform:uppercase;letter-spacing:.09em}
.hist-route span{display:block;margin-top:.25rem;font-size:.82rem;color:#6d6252}
.hist-quote{position:relative;max-width:900px;margin:5.6rem auto 0;background:var(--encre);color:var(--creme);text-align:center;padding:3.4rem 2rem 3.6rem}
.hist-quote::before{content:"\\201C";display:block;font-family:var(--display);font-size:5.6rem;line-height:.6;height:2.2rem;color:var(--beurre);opacity:.55}
.hist-quote p{font-family:var(--display);font-style:italic;font-size:clamp(1.3rem,2.6vw,2.05rem);line-height:1.34}
.hist-quote .sig{display:block;margin-top:.9rem;font-family:var(--script);font-style:normal;font-size:clamp(1.55rem,3vw,2.3rem);color:var(--beurre)}
.hist-cta{display:flex;justify-content:center;margin-top:3.2rem}
@media(max-width:980px){
  .hist-grid{grid-template-columns:1fr;gap:3.6rem}
  .hist-visu{max-width:520px;margin:auto;width:100%}
  .hist-texte{margin:auto}
  .hist-route{grid-template-columns:1fr 1fr;gap:2.2rem}
  .hist-route::before{display:none}
}
@media(max-width:700px){
  .histoire{padding:5rem 1.3rem 4.5rem}
  .hist-grid{margin-top:3.4rem}
  .hist-visu{padding-bottom:4rem}
  .hist-img-sub{width:48%;right:0;border-width:7px}
  .hist-stamp{font-size:1.25rem;left:0;top:-20px;padding:.45rem 1rem}
  .hist-route{grid-template-columns:1fr;gap:1.8rem;margin-top:4rem}
  .hist-quote{padding:2.6rem 1.4rem 2.8rem}
}
"""

ENTREPRISE_CSS = """
/* ================= L'ENTREPRISE ================= */
.entreprise{position:relative;background:#ffde90;color:var(--encre);padding:7.5rem 2.4rem 6.5rem;overflow:hidden}
.entreprise::before{content:"";position:absolute;top:-120px;right:-100px;width:420px;height:420px;background:radial-gradient(circle,rgba(255,255,255,.45),transparent 68%);pointer-events:none}
.entreprise::after{content:"";position:absolute;bottom:-140px;left:-120px;width:380px;height:380px;background:radial-gradient(circle,rgba(181,18,27,.08),transparent 70%);pointer-events:none}
.ent-wrap{position:relative;z-index:1;max-width:1360px;margin:auto}
.ent-grid{display:grid;grid-template-columns:1.05fr 1fr;gap:clamp(2.8rem,5vw,5.8rem);align-items:center}
.ent-texte .sec-sur{text-align:left;color:#7a6b56;margin-bottom:.8rem}
.ent-title{font-family:var(--script);font-weight:400;font-size:clamp(2.4rem,5vw,4rem);line-height:1.18;color:var(--encre)}
.ent-rule{width:0;height:1px;background:var(--rouge);margin:1.6rem 0 2rem;transform:none;transition:width 1.2s .25s cubic-bezier(.2,.7,.2,1),opacity .8s}
.ent-rule.in{width:110px}
.ent-texte p{color:#40372c;font-size:1.03rem;max-width:54ch;line-height:1.75}
.ent-texte p+p{margin-top:1.2rem}
.ent-accent{color:var(--encre)!important;font-family:var(--display);font-style:italic;font-size:clamp(1.15rem,1.9vw,1.5rem);line-height:1.42;border-left:2px solid var(--rouge);padding-left:1.15rem;margin-top:1.9rem!important}
.ent-points{list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:3rem;padding-top:2.2rem;border-top:1px solid rgba(28,22,17,.14)}
.ent-points li{padding:0 clamp(.8rem,2vw,2rem);text-align:center}
.ent-points li+li{border-left:1px solid rgba(28,22,17,.12)}
.ent-points b{display:block;font-family:var(--display);font-weight:500;font-size:clamp(1.1rem,1.8vw,1.35rem);letter-spacing:.03em;color:var(--encre);line-height:1.25}
.ent-points span{display:block;margin-top:.45rem;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:#6d6252;line-height:1.45}
.entreprise .btn-italic{margin-top:2.8rem;display:inline-block}
.ent-media{position:relative;padding-top:3.8rem}
.ent-video{position:relative;width:100%;max-width:440px;margin:0 auto;aspect-ratio:4/5;overflow:hidden;background:var(--encre);border-radius:999px 999px 0 0;box-shadow:0 36px 70px rgba(28,22,17,.22)}
.ent-video video{width:100%;height:100%;object-fit:cover;display:block}
.ent-video::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 55%,rgba(28,22,17,.45));pointer-events:none;border-radius:inherit}
.ent-badge-zone{position:absolute;left:50%;top:0;transform:translateX(-50%);z-index:4;width:min(100%,420px);height:148px;display:flex;align-items:center;justify-content:center;pointer-events:none}
.ent-ornament{position:absolute;inset:0;width:100%;height:100%;stroke:rgba(28,22,17,.38);fill:none;stroke-width:.65;stroke-linecap:round;stroke-linejoin:round}
.ent-ornament .fill-soft{fill:rgba(255,222,143,.35);stroke:none}
.ent-badge{position:relative;z-index:2;background:var(--encre);color:var(--creme);font-family:var(--display);font-style:italic;font-size:clamp(1.15rem,1.8vw,1.55rem);letter-spacing:.06em;padding:.85rem 2.4rem;white-space:nowrap;box-shadow:0 16px 36px rgba(28,22,17,.24);border:1px solid rgba(255,222,143,.35)}
.ent-legende{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:1.2rem 1.4rem 1.4rem;font-family:var(--script);font-size:clamp(1.35rem,2.5vw,1.65rem);color:var(--creme);text-align:center;text-shadow:0 2px 14px rgba(0,0,0,.45)}
@media(max-width:980px){
  .ent-grid{grid-template-columns:1fr;gap:3.4rem}
  .ent-media{order:-1;max-width:400px;margin:0 auto}
  .ent-texte{max-width:640px;margin:0 auto}
}
@media(max-width:700px){
  .entreprise{padding:5rem 1.3rem 4.5rem}
  .ent-points{grid-template-columns:1fr;gap:1.6rem;padding-top:1.8rem;margin-top:2.4rem}
  .ent-points li{padding:0;text-align:left}
  .ent-points li+li{border-left:none;padding-top:1.6rem;border-top:1px solid rgba(28,22,17,.1)}
  .ent-video{max-width:100%;border-radius:min(88vw,999px) min(88vw,999px) 0 0}
  .ent-badge-zone{height:130px;width:100%}
  .ent-badge{font-size:1.05rem;padding:.7rem 1.8rem}
}
"""

HISTOIRE_HTML = """
<!-- LA MAISON : L'HISTOIRE DU MACAJOU -->
<section class="histoire" id="histoire">
  <div class="hist-wrap">
    <div class="hist-head">
      <span class="sec-sur reveal" data-content="histoire.eyebrow">La Maison Macajou</span>
      <h2 class="hist-title reveal d1" data-content="histoire.title" data-content-type="html-br">Une histoire gourmande<br>qui traverse les cultures</h2>
      <div class="hist-rule reveal d2" aria-hidden="true"></div>
    </div>
    <div class="hist-grid">
      <div class="hist-visu reveal">
        <span class="hist-stamp" data-content="histoire.stamp" data-content-type="html-br">Depuis 10 ans<br>au Bénin</span>
        <figure class="hist-img hist-img-main">
          <img data-media="histoire.image1" src="/assets/adresses-points-vente.jpeg" alt="La Maison Macajou, boutique et atelier au Bénin" loading="lazy">
        </figure>
        <figure class="hist-img hist-img-sub">
          <img data-media="histoire.image2" src="/assets/cadeaux-idees.jpeg" alt="Macajoux à la noix de cajou du Bénin" loading="lazy">
        </figure>
      </div>
      <div class="hist-texte">
        <p class="hist-lead reveal d1" data-content="histoire.p1">Le macaron est le fruit d'un long voyage culinaire. Son origine remonte aux anciennes pâtisseries à base d'amandes du monde arabo-persan, c'est-à-dire au Moyen-Orient et dans certaines régions de l'Afrique du nord. Ces recettes auraient circulé dans le bassin méditerranéen grâce aux échanges commerciaux et culturels où l'Italie, notamment la Sicile, a développé des biscuits très proches du macaron actuel. Puis arrivé en France, il devient le macaron parisien, composé de deux coques réunies par une garniture, une référence mondiale.</p>
        <p class="hist-accent reveal d2" data-content="histoire.accent">Depuis 10 ans, Macajou a écrit un nouveau chapitre de cette histoire au Bénin.</p>
        <p class="reveal d2" data-content="histoire.p2">L'histoire du macaron était celle d'une évolution de formes et de savoir-faire. Celle du Macajou marque une nouvelle étape : pour la première fois, son ingrédient fondateur, l'amande, cède la place à la noix de cajou, offrant à cette gourmandise une identité gustative entièrement nouvelle, agricole et culturelle enracinée au Bénin.</p>
      </div>
    </div>
    <ol class="hist-route reveal">
      <li><span class="dot" aria-hidden="true"></span><b data-content="histoire.etape1.lieu">Monde arabo persan</b><span data-content="histoire.etape1.note">Les premières pâtisseries d'amandes</span></li>
      <li><span class="dot" aria-hidden="true"></span><b data-content="histoire.etape2.lieu">Sicile, Italie</b><span data-content="histoire.etape2.note">Le biscuit tout proche du macaron</span></li>
      <li><span class="dot" aria-hidden="true"></span><b data-content="histoire.etape3.lieu">Paris, France</b><span data-content="histoire.etape3.note">Deux coques et une garniture</span></li>
      <li><span class="dot" aria-hidden="true"></span><b data-content="histoire.etape4.lieu">Cotonou, Bénin</b><span data-content="histoire.etape4.note">La cajou remplace l'amande</span></li>
    </ol>
    <blockquote class="hist-quote reveal">
      <p data-content="histoire.quote">Le macaron est une histoire universelle.</p>
      <span class="sig" data-content="histoire.signature">Le Macajou en est la signature béninoise.</span>
    </blockquote>
    <div class="hist-cta reveal d1">
      <a class="btn-italic" href="#collection" data-content="histoire.cta" data-compose-coffret>Goûter cette histoire</a>
    </div>
  </div>
</section>
"""

ENTREPRISE_HTML = """
<!-- L'ENTREPRISE -->
<section class="entreprise" id="entreprise">
  <div class="ent-wrap">
    <div class="ent-grid">
      <div class="ent-texte">
        <span class="sec-sur reveal" data-content="entreprise.eyebrow">L'entreprise</span>
        <h2 class="ent-title reveal d1" data-content="entreprise.title" data-content-type="html-br">Une maison béninoise<br>d'innovation culinaire</h2>
        <div class="ent-rule reveal d1" aria-hidden="true"></div>
        <p class="reveal d2" data-content="entreprise.p1">MACAJOU est une maison béninoise d'innovation culinaire qui crée et fabrique des gourmandises locales à partir de matières premières africaines, principalement béninoises.</p>
        <p class="reveal d2" data-content="entreprise.p2">Sa spécialité, le Macajou (du même nom que l'entreprise), est une gourmandise unique composée de deux biscuits légers et fondants à base de poudre de noix de cajou (0% de blé), assemblés par une délicieuse crème fondante aux saveurs locales.</p>
        <p class="ent-accent reveal d3" data-content="entreprise.p3">Contrairement à la recette traditionnelle à base d'amande, le Macajou met à l'honneur la noix de cajou du Bénin, offrant une identité et un goût uniques.</p>
        <ul class="ent-points reveal d3">
          <li><b data-content="entreprise.point1.valeur">0% de blé</b><span data-content="entreprise.point1.label">Sans farine de blé</span></li>
          <li><b data-content="entreprise.point2.valeur">Poudre de cajou</b><span data-content="entreprise.point2.label">Deux biscuits fondants</span></li>
          <li><b data-content="entreprise.point3.valeur">Saveurs locales</b><span data-content="entreprise.point3.label">Matières premières africaines</span></li>
        </ul>
        <a class="btn-italic reveal d3" href="#collection" data-content="entreprise.cta" data-compose-coffret>Découvrir nos gourmandises</a>
      </div>
      <div class="ent-media reveal d1">
        <div class="ent-badge-zone">
          <svg class="ent-ornament" viewBox="0 0 420 148" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path class="fill-soft" d="M210 18c-52 0-94 28-94 62 0 22 18 40 40 40h108c22 0 40-18 40-40 0-34-42-62-94-62z"/>
            <path d="M210 24c-46 0-84 24-84 54"/>
            <g transform="translate(58,52)">
              <path d="M0 18 Q0 0 16 0 Q32 0 32 18"/>
              <line x1="0" y1="18" x2="32" y2="18"/>
              <path d="M0 18 Q0 34 16 34 Q32 34 32 18"/>
            </g>
            <g transform="translate(330,52)">
              <path d="M0 18 Q0 0 16 0 Q32 0 32 18"/>
              <line x1="0" y1="18" x2="32" y2="18"/>
              <path d="M0 18 Q0 34 16 34 Q32 34 32 18"/>
            </g>
            <path d="M92 88 Q110 62 128 88 Q146 114 128 88 Q110 62 92 88"/>
            <path d="M292 88 Q310 62 328 88 Q346 114 328 88 Q310 62 292 88"/>
            <circle cx="110" cy="88" r="2.5" fill="rgba(28,22,17,.35)" stroke="none"/>
            <circle cx="310" cy="88" r="2.5" fill="rgba(28,22,17,.35)" stroke="none"/>
            <path d="M128 88 C148 72 172 72 192 88"/>
            <path d="M228 88 C248 72 272 72 292 88"/>
            <path d="M168 118 Q210 132 252 118"/>
            <path d="M148 108 Q210 126 272 108"/>
          </svg>
          <span class="ent-badge" data-content="entreprise.badge">Fabriqué au Bénin</span>
        </div>
        <div class="ent-video">
          <video autoplay muted loop playsinline>
            <source data-media="entreprise.video" src="/assets/adresses-boutique.mp4" type="video/mp4">
          </video>
          <span class="ent-legende" data-content="entreprise.legende">La maison Macajou</span>
        </div>
      </div>
    </div>
  </div>
</section>
"""

ANNOUNCE_CSS = """/* ================= BANDEAU ANNONCE ================= */
.annonce{background:var(--encre);color:var(--creme);border-bottom:1px solid rgba(255,222,143,.4);text-align:center;font-size:.88rem;letter-spacing:.16em;text-transform:uppercase;padding:.95rem 3.4rem;position:relative;line-height:1.5;overflow:hidden}
.annonce [data-content]{position:relative;z-index:1;font-family:var(--display);font-weight:500;font-size:clamp(.82rem,1.4vw,1rem);letter-spacing:.18em}
.annonce [data-content]::before,.annonce [data-content]::after{content:"";display:inline-block;width:28px;height:1px;background:var(--beurre);vertical-align:middle;margin:0 1rem}
.annonce::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 32%,rgba(255,222,143,.18) 50%,transparent 68%);animation:annonceShine 7s linear infinite;pointer-events:none}
@keyframes annonceShine{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
.annonce .close{position:absolute;right:1.2rem;top:50%;transform:translateY(-50%);z-index:2;background:none;border:none;font-size:1rem;cursor:pointer;color:var(--creme);opacity:.6}
.annonce .close:hover{opacity:1}
@media(max-width:700px){
  .annonce{padding:.85rem 2.6rem}
  .annonce [data-content]::before,.annonce [data-content]::after{display:none}
}
"""

NAV_CSS = """/* ================= NAVIGATION ================= */
.mast{position:relative;background:var(--encre)}
header{position:absolute;top:0;left:0;right:0;z-index:900;transition:background .4s,box-shadow .4s,border-color .4s}
header.on-hero{background:transparent;border-bottom:1px solid rgba(251,245,232,.25)}
header.on-hero .nav-link,header.on-hero .nav-ic,header.on-hero .burger{color:var(--creme);text-shadow:0 1px 8px rgba(0,0,0,.45)}
header.on-hero .nav-ic svg{filter:drop-shadow(0 1px 5px rgba(0,0,0,.45))}
header.solid{position:fixed;top:0;left:0;right:0;background:rgba(251,245,232,.96);backdrop-filter:blur(14px);border-bottom:1px solid rgba(28,22,17,.08)}
header.solid.scrolled{box-shadow:0 8px 30px rgba(28,22,17,.06)}
"""

HERO_CSS = """/* ================= HERO VIDÉO ================= */
.hero{position:relative;height:calc(100vh - var(--annonce-h,0px));min-height:620px;overflow:hidden;background:var(--encre);margin-top:0}
"""

SETTOP_JS = """
const annonceEl=document.getElementById('annonce');
const setTopVars=()=>{
  const root=document.documentElement.style;
  const visible=annonceEl&&annonceEl.offsetParent!==null;
  root.setProperty('--annonce-h',(visible?annonceEl.offsetHeight:0)+'px');
  if(!header.classList.contains('scrolled')) root.setProperty('--head-h',header.offsetHeight+'px');
};
function fermerAnnonce(){
  if(annonceEl) annonceEl.style.display='none';
  setTopVars();
}
const onScroll=()=>{
  const past=window.scrollY>10;
  header.classList.toggle('solid',past);
  header.classList.toggle('on-hero',!past);
  header.classList.toggle('scrolled',past);
  if(!past) setTopVars();
};
window.addEventListener('scroll',onScroll,{passive:true});onScroll();
window.addEventListener('resize',setTopVars);
window.addEventListener('load',setTopVars);
const navLogo=document.querySelector('.nav-logo img');
if(navLogo) navLogo.addEventListener('load',setTopVars);
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(setTopVars);
setTopVars();
"""


def main():
    t = INDEX.read_text()

    # variables
    t = t.replace(
        "  --script:'Pinyon Script',cursive;\n}",
        "  --script:'Pinyon Script',cursive;\n  --annonce-h:42px;\n  --head-h:114px;\n}",
    )

    # annonce css
    start = t.index("/* ================= BANDEAU ANNONCE ================= */")
    end = t.index("/* ================= NAVIGATION ================= */")
    nav_rest = t[end:]
    t = t[:start] + ANNOUNCE_CSS + nav_rest

    # navigation: mast + header absolute
    t = t.replace(
        "/* ================= NAVIGATION ================= */\nheader{position:sticky;top:0;z-index:900;transition:background .4s,box-shadow .4s,border-color .4s}",
        "/* ================= NAVIGATION ================= */\n.mast{position:relative;background:var(--encre)}\nheader{position:absolute;top:0;left:0;right:0;z-index:900;transition:background .4s,box-shadow .4s,border-color .4s}",
    )
    t = t.replace(
        "header.solid{background:rgba(251,245,232,.96);backdrop-filter:blur(14px);border-bottom:1px solid rgba(28,22,17,.08)}",
        "header.solid{position:fixed;top:0;left:0;right:0;background:rgba(251,245,232,.96);backdrop-filter:blur(14px);border-bottom:1px solid rgba(28,22,17,.08)}",
    )

    # hero line only (keep rest of hero css)
    t = t.replace(
        ".hero{position:relative;height:calc(100vh - 42px);min-height:620px;overflow:hidden;background:var(--encre);margin-top:-89px}",
        ".hero{position:relative;height:calc(100vh - var(--annonce-h,0px));min-height:620px;overflow:hidden;background:var(--encre);margin-top:0}",
    )
    t = t.replace(
        "padding:89px 1.5rem 0}",
        "padding:var(--head-h,114px) 1.5rem 0}",
    )
    t = t.replace(
        "  .hero{margin-top:-75px}\n  .hero-content{padding-top:75px}",
        "  :root{--head-h:92px}",
    )

    # insert histoire + entreprise css before coffrets grid comment
    marker = "/* ================= COFFRETS GRID ================= */"
    if HISTOIRE_CSS.strip() not in t:
        t = t.replace(marker, HISTOIRE_CSS + ENTREPRISE_CSS + marker)

    # annonce html
    t = t.replace(
        "Une pause gourmande Macajou livrée en 2h à Cotonou &amp; Calavi",
        "Une pause gourmande Macajou livrée en 2h sur Calavi et Cotonou",
    )
    t = t.replace(
        'onclick="document.getElementById(\'annonce\').style.display=\'none\'"',
        'onclick="fermerAnnonce()"',
    )

    # nav links
    t = t.replace('href="#maison">La Maison</a>', 'href="#histoire">La Maison</a>', 2)
    t = t.replace('href="#cadeaux">Entreprises</a>', 'href="#entreprise">Entreprises</a>', 2)

    # mast wrap
    if 'class="mast"' not in t:
        nav_i = t.index("<!-- NAVIGATION -->")
        hero_end = t.index("</section>", t.index("<!-- HERO VIDÉO -->")) + len("</section>")
        block = t[nav_i:hero_end]
        t = t[:nav_i] + '<!-- MAST : header + hero -->\n<div class="mast">\n' + block + "\n</div>" + t[hero_end:]

    # histoire section
    if 'id="histoire"' not in t:
        split_i = t.index("<!-- SPLIT : GOURMANDISE -->")
        coffret_i = t.index("<!-- COFFRET SUR MESURE -->")
        t = t[:coffret_i] + HISTOIRE_HTML + "\n" + ENTREPRISE_HTML + "\n" + t[coffret_i:]

    # adresses title
    t = t.replace(
        'Nos points de vente<br>&amp; livraisons',
        'Nos points de vente',
    )

    # footer links
    if 'href="#entreprise">L\'entreprise</a>' not in t:
        t = t.replace(
            '<li><a href="#maison">Notre savoir-faire</a></li>',
            '<li><a href="#histoire">Notre histoire</a></li>\n        <li><a href="#entreprise">L\'entreprise</a></li>',
        )

    # sans tirets visibles (html texte seulement)
    text_repls = [
        ("MACAJOU Gourmandises — La haute", "MACAJOU Gourmandises, la haute"),
        ("Pâtisserie de cajou — Bénin", "Pâtisserie de cajou, Bénin"),
        ("jusqu'à la contenance exacte.", "jusqu'à la contenance exacte."),
        ("jusqu’à la contenance exacte.", "jusqu'à la contenance exacte."),
        ("Choisissez votre coffret, puis composez-le avec les macajoux de votre choix — jusqu", "Choisissez votre coffret, puis composez-le avec les macajoux de votre choix, jusqu"),
        ("Macajou Gourmandises — Accueil", "Macajou Gourmandises, Accueil"),
        ("© 2026 ETS MACAJOU — Macajou", "© 2026 ETS MACAJOU, Macajou"),
    ]
    for a, b in text_repls:
        t = t.replace(a, b)

    # script setTopVars
    if "setTopVars" not in t:
        old = """const onScroll=()=>{
  const past=window.scrollY>10;
  header.classList.toggle('solid',past);
  header.classList.toggle('on-hero',!past);
  header.classList.toggle('scrolled',past);
};
window.addEventListener('scroll',onScroll,{passive:true});onScroll();"""
        t = t.replace(old, SETTOP_JS.strip())

    # cache
    t = t.replace("?v=20260731-copy", "?v=20260802-macajou")
    t = t.replace("?v=20260731-maison", "?v=20260802-macajou")
    t = t.replace("?v=20260731-bandeau", "?v=20260802-macajou")
    t = t.replace("?v=20260731-mast", "?v=20260802-macajou")
    t = t.replace("?v=20260731-entreprise", "?v=20260802-macajou")
    if "?v=20260802-macajou" not in t:
        t = t.replace("/js/site-content.js", "/js/site-content.js?v=20260802-macajou")
        t = t.replace("/js/landing.js", "/js/landing.js?v=20260802-macajou")

    INDEX.write_text(t)
    print("index.html patched OK")


if __name__ == "__main__":
    main()
