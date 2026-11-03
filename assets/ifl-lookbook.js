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

  // Comprar o look: adiciona todas as joias do look à sacola e abre o carrinho lateral
  function buyLook(btn) {
    var ids = (btn.getAttribute('data-variants') || '').split(',').filter(Boolean);
    if (!ids.length) return;
    var err = btn.parentElement.querySelector('.ifl-buylook__error');
    if (err) { err.hidden = true; err.textContent = ''; }
    btn.classList.add('is-loading');
    var root = (window.theme && window.theme.routes && window.theme.routes.root) || '/';
    if (root.slice(-1) !== '/') root += '/';
    fetch(root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({
        items: ids.map(function (id) { return { id: Number(id), quantity: 1 }; }),
        sections: 'cart-drawer',
        sections_url: window.location.pathname
      })
    })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok || d.status) throw d; return d; }); })
      .then(function (data) {
        var html = data.sections && data.sections['cart-drawer'];
        var current = document.querySelector('[data-cart-drawer]');
        if (html && current) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var fresh = doc.querySelector('[data-cart-drawer]');
          if (fresh) current.innerHTML = fresh.innerHTML;
          var src = current.querySelector('[data-cart-count-source]');
          if (src) document.querySelectorAll('[data-cart-count]').forEach(function (el) {
            el.textContent = src.dataset.cartCountSource; el.dataset.count = src.dataset.cartCountSource;
          });
        }
        btn.classList.remove('is-loading');
        btn.classList.add('is-done');
        setTimeout(function () { btn.classList.remove('is-done'); }, 2600);
        var toggle = document.querySelector('[data-cart-toggle]');
        if (toggle && current) toggle.click();
        else window.location.href = root + 'cart';
      })
      .catch(function (e) {
        btn.classList.remove('is-loading');
        if (err) { err.textContent = (e && (e.description || e.message)) || 'Não foi possível adicionar o look. Tente novamente.'; err.hidden = false; }
      });
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-ifl-buy-look]');
    if (btn) { e.preventDefault(); buyLook(btn); }
  });

  // Celular: tocar no "+" abre uma gaveta com o produto
  var sheet, sheetOverlay, sheetIn, lastFocus;
  var useSheet = function () { return mobile() || window.matchMedia('(hover: none)').matches; };
  function ensureSheet() {
    if (sheet) return;
    sheet = document.createElement('div');
    sheet.className = 'ifl-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML = '<div class="ifl-sheet__grab" aria-hidden="true"></div><button type="button" class="ifl-sheet__close" aria-label="Fechar">&times;</button><div class="ifl-sheet__in"></div>';
    sheetOverlay = document.createElement('div');
    sheetOverlay.className = 'ifl-sheet-overlay';
    document.body.appendChild(sheet);
    document.body.appendChild(sheetOverlay);
    sheetIn = sheet.querySelector('.ifl-sheet__in');
    sheet.querySelector('.ifl-sheet__close').addEventListener('click', closeSheet);
    sheetOverlay.addEventListener('click', closeSheet);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
    // arrastar para baixo fecha
    var startY = null;
    sheet.addEventListener('touchstart', function (e) { startY = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener('touchmove', function (e) {
      if (startY === null) return;
      var dy = Math.max(0, e.touches[0].clientY - startY);
      sheet.style.transition = 'none';
      sheet.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    sheet.addEventListener('touchend', function (e) {
      var dy = startY === null ? 0 : e.changedTouches[0].clientY - startY;
      startY = null;
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (dy > 80) closeSheet();
    });
  }
  function openSheet(tpl, trigger) {
    ensureSheet();
    sheetIn.innerHTML = '';
    sheetIn.appendChild(tpl.content.cloneNode(true));
    lastFocus = trigger;
    sheet.setAttribute('aria-hidden', 'false');
    sheetOverlay.classList.add('is-open');
    requestAnimationFrame(function () { sheet.classList.add('is-open'); });
    var cta = sheet.querySelector('.ifl-sheet__cta');
    if (cta) setTimeout(function () { cta.focus({ preventScroll: true }); }, 300);
  }
  function closeSheet() {
    if (!sheet || !sheet.classList.contains('is-open')) return;
    sheet.classList.remove('is-open');
    sheetOverlay.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('click', function (e) {
    var dot = e.target.closest && e.target.closest('.ifl-spot__dot');
    if (!dot || !useSheet()) return;
    var tpl = dot.parentElement.querySelector('template[data-ifl-sheet]');
    if (!tpl) return;
    e.preventDefault();
    openSheet(tpl, dot);
  });

  function frame() {
    ticking = false;
    var vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;
    if (progress) progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    // esconde a aba "Ver produtos" quando a grade já está na tela
    var tab = document.querySelector('[data-ifl-tab]');
    var grid = document.getElementById('ifl-produtos');
    if (tab && grid) tab.classList.toggle('is-hidden', grid.getBoundingClientRect().top < vh * 0.6);
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
