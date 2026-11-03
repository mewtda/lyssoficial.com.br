/* Isabella Fiorentino × Lyss — lookbook (usado apenas no template collection.izabela-fiorentino) */
(function () {
  if (window.__iflLookbook) return;
  window.__iflLookbook = true;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = function () { return window.innerWidth <= 820; };

  var io = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        });
      }, { threshold: 0.18 })
    : null;

  var progress, cursor, ticking = false;

  function ensureChrome() {
    if (!progress) {
      progress = document.createElement('div');
      progress.className = 'ifl-progress';
      document.body.appendChild(progress);
    }
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.className = 'ifl-cursor';
      cursor.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cursor);
      window.addEventListener('mousemove', function (e) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
      }, { passive: true });
    }
  }

  function bind(root) {
    ensureChrome();
    root.querySelectorAll('.ifl-reveal, .ifl-look__media').forEach(function (el) {
      if (el.dataset.iflBound) return;
      el.dataset.iflBound = '1';
      if (io && !reduce) io.observe(el); else el.classList.add('is-in');
    });
    root.querySelectorAll('[data-ifl-cursor]').forEach(function (el) {
      if (el.dataset.iflCur) return;
      el.dataset.iflCur = '1';
      var label = el.getAttribute('data-ifl-cursor') || '';
      el.addEventListener('mouseenter', function () { cursor.textContent = label; cursor.classList.add('is-on'); });
      el.addEventListener('mouseleave', function () { cursor.classList.remove('is-on'); });
    });
    root.querySelectorAll('.ifl-spot').forEach(function (spot) {
      if (spot.dataset.iflSpot) return;
      spot.dataset.iflSpot = '1';
      var look = spot.closest('.ifl-look');
      var id = spot.getAttribute('data-ifl-spot');
      var card = look && look.querySelector('[data-ifl-piece="' + id + '"]');
      spot.addEventListener('mouseenter', function () { cursor.classList.remove('is-on'); if (card) card.classList.add('is-hl'); });
      spot.addEventListener('mouseleave', function () {
        if (card) card.classList.remove('is-hl');
        if (spot.closest('[data-ifl-cursor]:hover')) cursor.classList.add('is-on');
      });
    });
  }

  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;
    if (progress) progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    if (reduce) return;

    document.querySelectorAll('[data-ifl-par], .ifl-par').forEach(function (img) {
      var r = img.parentElement.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      var p = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.transform = 'scale(1.15) translateY(' + (p * -6) + '%)';
    });

    if (!mobile()) {
      document.querySelectorAll('[data-ifl-hz]').forEach(function (hz) {
        var track = hz.querySelector('[data-ifl-track]');
        if (!track) return;
        var hr = hz.getBoundingClientRect();
        var t = Math.min(1, Math.max(0, -hr.top / (hr.height - vh)));
        track.style.transform = 'translateX(' + (-t * Math.max(0, track.scrollWidth - window.innerWidth)) + 'px)';
      });
    }
  }

  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(frame); }
  }

  var started = false;
  function init() {
    if (started || !document.querySelector('.ifl')) return;
    started = true;
    bind(document);
    frame();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // editor do Shopify
  document.addEventListener('shopify:section:load', function (e) { init(); bind(e.target); frame(); });
})();
