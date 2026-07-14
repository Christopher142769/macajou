/** Applique les médias du dashboard sur la landing (data-media).
 *  N'importe quel emplacement accepte une image OU une vidéo. */
(function () {
  function isVideoUrl(url) {
    return /\.(mp4|webm|mov|m4v|ogv)$/i.test(url || '');
  }

  function makeVideo(url, ref) {
    const v = document.createElement('video');
    v.src = url;
    v.autoplay = true;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('muted', '');
    // Reprend les classes/styles de l'élément remplacé pour garder la mise en page
    if (ref) {
      v.className = ref.className;
      v.style.cssText = ref.style.cssText;
      if (!v.style.objectFit) v.style.objectFit = 'cover';
      if (!v.style.width) v.style.width = '100%';
      if (!v.style.height) v.style.height = '100%';
    }
    v.play && v.play().catch(() => {});
    return v;
  }

  function applyToElement(el, item) {
    if (!item || !item.url) return;
    const url = item.url;
    const type = el.getAttribute('data-media-type') || 'src';

    if (type === 'bg') {
      el.style.backgroundImage = `url("${url}")`;
      return;
    }
    if (type === 'poster') {
      el.setAttribute('poster', url);
      return;
    }
    if (el.tagName === 'SOURCE') {
      el.src = url;
      const video = el.closest('video');
      if (video) {
        video.load();
        video.play && video.play().catch(() => {});
      }
      return;
    }

    // IMG qui devient une vidéo si on a uploadé une vidéo
    if (el.tagName === 'IMG' && isVideoUrl(url)) {
      const video = makeVideo(url, el);
      el.replaceWith(video);
      return;
    }

    if (el.tagName === 'IMG') {
      el.src = url;
      if (item.alt) el.alt = item.alt;
      return;
    }

    if (el.tagName === 'VIDEO') {
      el.src = url;
      el.load && el.load();
      el.play && el.play().catch(() => {});
      return;
    }

    el.style.backgroundImage = `url("${url}")`;
  }

  function applyMap(map) {
    if (!map) return;

    document.querySelectorAll('[data-media]').forEach((el) => {
      applyToElement(el, map[el.getAttribute('data-media')]);
    });

    // Hero : média (image ou vidéo) remplace la vidéo par défaut si renseigné
    const heroMedia = document.querySelector('.hero-media');
    const heroItem = map['hero.image'];
    if (heroMedia && heroItem && heroItem.url) {
      const defaultVideo = heroMedia.querySelector('video:not(.hero-custom)');
      if (defaultVideo) defaultVideo.style.display = 'none';
      let node = heroMedia.querySelector('.hero-custom');
      if (node) node.remove();

      if (isVideoUrl(heroItem.url)) {
        node = makeVideo(heroItem.url);
        node.classList.add('hero-custom');
        node.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0;z-index:0';
      } else {
        node = document.createElement('img');
        node.className = 'hero-custom';
        node.alt = heroItem.alt || 'Macajou';
        node.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0;z-index:0';
        node.src = heroItem.url;
      }
      heroMedia.insertBefore(node, heroMedia.firstChild);
    }
  }

  async function load() {
    try {
      const res = await fetch('/api/site-media/map');
      if (!res.ok) return;
      applyMap(await res.json());
    } catch (err) {
      console.warn('Médias site:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
