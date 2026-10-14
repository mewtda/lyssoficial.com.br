(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const desktop = window.matchMedia('(min-width: 768px)');

  const updateHeaderOffset = () => {
    const header = $('[data-header]');
    if (!header) return;
    const bottom = Math.max(0, header.getBoundingClientRect().bottom);
    document.documentElement.style.setProperty('--menu-top', `${bottom}px`);
    document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    const bar = $('[data-announcement]');
    if (bar) document.documentElement.style.setProperty('--announcement-height', `${bar.offsetHeight}px`);
  };

  const lockScroll = (lock) => document.body.classList.toggle('is-locked', lock);

  const panels = new Set();
  const closeAllPanels = (except) => {
    panels.forEach((panel) => {
      if (panel !== except) panel.close();
    });
  };

  const createPanel = ({ element, overlay, toggles = [], onOpen, onClose, lock = true }) => {
    const panel = {
      isOpen: false,
      open() {
        closeAllPanels(panel);
        panel.isOpen = true;
        updateHeaderOffset();
        element.classList.add('is-open');
        overlay?.classList.add('is-active');
        toggles.forEach((toggle) => toggle.setAttribute('aria-expanded', 'true'));
        if (lock) lockScroll(true);
        onOpen?.();
      },
      close() {
        if (!panel.isOpen) return;
        panel.isOpen = false;
        element.classList.remove('is-open');
        overlay?.classList.remove('is-active');
        toggles.forEach((toggle) => toggle.setAttribute('aria-expanded', 'false'));
        if (lock) lockScroll(false);
        onClose?.();
      },
      toggle() {
        panel.isOpen ? panel.close() : panel.open();
      },
    };
    overlay?.addEventListener('click', () => panel.close());
    panels.add(panel);
    return panel;
  };

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAllPanels();
  });

  const initAnnouncement = () => {
    const bar = $('[data-announcement]');
    if (!bar) return;
    const items = $$('.announcement-bar__item', bar);
    if (items.length < 2) return;
    let index = 0;
    const interval = Number(bar.dataset.interval) || 5000;
    setInterval(() => {
      items[index].classList.remove('is-active');
      index = (index + 1) % items.length;
      items[index].classList.add('is-active');
    }, interval);
  };

  const initHeader = () => {
    const menu = $('[data-mobile-menu]');
    const toggle = $('[data-menu-toggle]');
    if (menu && toggle) {
      const iconOpen = $('[data-menu-icon-open]', toggle);
      const iconClose = $('[data-menu-icon-close]', toggle);
      const panel = createPanel({
        element: menu,
        toggles: [toggle],
        onOpen: () => {
          iconOpen.hidden = true;
          iconClose.hidden = false;
        },
        onClose: () => {
          iconOpen.hidden = false;
          iconClose.hidden = true;
        },
      });
      toggle.addEventListener('click', () => panel.toggle());
      desktop.addEventListener('change', (event) => {
        if (event.matches) panel.close();
      });
    }

    const overlay = $('[data-header-overlay]');
    $$('.header__nav-item').forEach((item) => {
      if (!$('[data-mega-menu]', item)) return;
      item.addEventListener('mouseenter', () => {
        updateHeaderOffset();
        overlay?.classList.add('is-active');
      });
      item.addEventListener('mouseleave', () => overlay?.classList.remove('is-active'));
    });

    updateHeaderOffset();
    window.addEventListener('resize', updateHeaderOffset, { passive: true });
    window.addEventListener('scroll', updateHeaderOffset, { passive: true });
  };

  const initSearch = () => {
    const dialog = $('[data-search-dialog]');
    if (!dialog) return;
    const input = $('[data-search-input]', dialog);
    const results = $('[data-search-results]', dialog);
    const toggles = $$('[data-search-toggle]');
    const panel = createPanel({
      element: dialog,
      overlay: $('[data-search-overlay]'),
      toggles,
      onOpen: () => setTimeout(() => input.focus(), 50),
    });
    toggles.forEach((toggle) => toggle.addEventListener('click', () => panel.toggle()));
    $('[data-search-close]', dialog)?.addEventListener('click', () => panel.close());

    let controller;
    let timer;
    const search = async (term) => {
      controller?.abort();
      if (!term.trim()) {
        results.innerHTML = '';
        return;
      }
      controller = new AbortController();
      const params = new URLSearchParams({
        q: term,
        'resources[type]': 'product',
        'resources[limit]': '8',
        section_id: 'predictive-search',
      });
      try {
        const response = await fetch(`${window.theme.routes.search}?${params}`, { signal: controller.signal });
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const content = $('#PredictiveSearchResults', doc);
        results.innerHTML = content ? content.outerHTML : '';
        initCards(results);
      } catch (error) {
        if (error.name !== 'AbortError') results.innerHTML = '';
      }
    };
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => search(input.value), 250);
    });
  };

  const initSlider = (slider) => {
    if (slider.dataset.sliderReady) return;
    slider.dataset.sliderReady = 'true';
    const track = $('[data-slider-track]', slider);
    if (!track) return;
    const slides = () => $$('[data-slide]', track);
    const dots = $$('[data-slider-dot]', slider);
    const loop = slider.hasAttribute('data-loop');
    const autoplay = Number(slider.dataset.autoplay) || 0;

    const slideWidth = () => {
      const [first, second] = slides();
      if (!first) return track.clientWidth;
      if (second) return second.offsetLeft - first.offsetLeft;
      return first.offsetWidth;
    };
    const currentIndex = () => Math.round(track.scrollLeft / Math.max(1, slideWidth()));
    const maxScroll = () => track.scrollWidth - track.clientWidth;

    const goTo = (index) => {
      track.scrollTo({ left: index * slideWidth(), behavior: 'smooth' });
    };
    const next = () => {
      if (track.scrollLeft >= maxScroll() - 4) {
        if (loop) goTo(0);
        return;
      }
      goTo(currentIndex() + 1);
    };
    const prev = () => {
      if (track.scrollLeft <= 4) {
        if (loop) track.scrollTo({ left: maxScroll(), behavior: 'smooth' });
        return;
      }
      goTo(currentIndex() - 1);
    };

    $('[data-slider-next]', slider)?.addEventListener('click', next);
    $('[data-slider-prev]', slider)?.addEventListener('click', prev);
    dots.forEach((dot) => dot.addEventListener('click', () => goTo(Number(dot.dataset.sliderDot))));

    const updateDots = () => {
      const index = track.scrollLeft >= maxScroll() - 4 ? slides().length - 1 : currentIndex();
      dots.forEach((dot, i) => dot.setAttribute('aria-current', i === index ? 'true' : 'false'));
    };
    let frame;
    track.addEventListener(
      'scroll',
      () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(updateDots);
      },
      { passive: true }
    );

    slider.goTo = goTo;

    if (autoplay && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      let timer;
      const start = () => {
        stop();
        timer = setInterval(next, autoplay);
      };
      const stop = () => clearInterval(timer);
      slider.addEventListener('mouseenter', stop);
      slider.addEventListener('mouseleave', start);
      slider.addEventListener('touchstart', stop, { passive: true });
      slider.addEventListener('touchend', start, { passive: true });
      document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
      start();
    }

    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    track.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      isDown = true;
      moved = false;
      startX = event.clientX;
      startScroll = track.scrollLeft;
    });
    track.addEventListener('pointermove', (event) => {
      if (!isDown) return;
      const delta = event.clientX - startX;
      if (Math.abs(delta) > 5) {
        moved = true;
        track.style.scrollSnapType = 'none';
        track.style.scrollBehavior = 'auto';
        track.scrollLeft = startScroll - delta;
      }
    });
    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      track.style.scrollSnapType = '';
      track.style.scrollBehavior = '';
      if (moved) goTo(currentIndex());
    };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointerleave', endDrag);
    track.addEventListener(
      'click',
      (event) => {
        if (moved) {
          event.preventDefault();
          event.stopPropagation();
          moved = false;
        }
      },
      true
    );
    track.addEventListener('dragstart', (event) => event.preventDefault());
  };

  const initSliders = (root = document) => $$('[data-slider]', root).forEach(initSlider);

  const initCards = (root = document) => {
    $$('[data-card-scroller]', root).forEach((scroller) => {
      if (scroller.dataset.ready) return;
      scroller.dataset.ready = 'true';
      const dots = $$('.card__mobile-dot', scroller.parentElement);
      scroller.addEventListener(
        'scroll',
        () => {
          const index = Math.round(scroller.scrollLeft / Math.max(1, scroller.clientWidth));
          dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
        },
        { passive: true }
      );
    });
  };

  const cart = {
    panel: null,
    async request(url, body) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || data.status) throw data;
      return data;
    },
    renderDrawer(html) {
      if (!html) return;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const fresh = $('[data-cart-drawer]', doc);
      const current = $('[data-cart-drawer]');
      if (fresh && current) current.innerHTML = fresh.innerHTML;
      const count = $('[data-cart-count-source]', current)?.dataset.cartCountSource;
      if (count !== undefined) cart.updateCount(count);
    },
    updateCount(count) {
      $$('[data-cart-count]').forEach((el) => {
        el.textContent = count;
        el.dataset.count = count;
      });
    },
    async add(formData) {
      formData.append('sections', 'cart-drawer');
      formData.append('sections_url', window.location.pathname);
      const response = await fetch(`${window.theme.routes.cartAdd}.js`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || data.status) throw data;
      cart.renderDrawer(data.sections?.['cart-drawer']);
      cart.panel?.open();
      return data;
    },
    async change(line, quantity) {
      const container = $('[data-cart-page]') || $('[data-cart-drawer]');
      container?.classList.add('is-updating');
      try {
        const data = await cart.request(`${window.theme.routes.cartChange}.js`, {
          line,
          quantity,
          sections: 'cart-drawer',
          sections_url: window.location.pathname,
        });
        if ($('[data-cart-page]')) {
          window.location.reload();
          return;
        }
        cart.renderDrawer(data.sections?.['cart-drawer']);
        cart.updateCount(data.item_count);
      } catch (error) {
        window.alert(error.description || error.message || 'Error');
      } finally {
        container?.classList.remove('is-updating');
      }
    },
  };

  const initCart = () => {
    const drawer = $('[data-cart-drawer]');
    if (drawer) {
      cart.panel = createPanel({
        element: drawer,
        overlay: $('[data-cart-overlay]'),
        onOpen: () => drawer.focus(),
      });
      $$('[data-cart-toggle]').forEach((toggle) =>
        toggle.addEventListener('click', (event) => {
          if (document.body.classList.contains('template-cart')) return;
          event.preventDefault();
          cart.panel.open();
        })
      );
    }

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-cart-close]')) {
        cart.panel?.close();
        return;
      }
      const button = event.target.closest('[data-qty-change]');
      if (button) {
        event.preventDefault();
        cart.change(Number(button.dataset.line), Math.max(0, Number(button.dataset.qtyChange)));
      }
    });

    document.addEventListener('change', (event) => {
      const input = event.target.closest('[data-qty-input]');
      if (input) cart.change(Number(input.dataset.line), Math.max(0, Number(input.value) || 0));
    });
  };

  const initProduct = (root) => {
    const form = $('[data-product-form]', root);
    if (!form) return;
    const variantInput = $('[data-variant-id]', form);
    const button = $('[data-add-to-cart]', form);
    const error = $('[data-product-error]', root);
    const variantsJson = $('[data-product-json]', root);
    const variants = variantsJson ? JSON.parse(variantsJson.textContent) : [];
    const gallery = $('[data-product-gallery]', root);
    const sectionId = root.dataset.section;
    const baseUrl = root.dataset.url;

    const selectedOptions = () =>
      $$('.variant-picker__option', form).map((fieldset) => $('input:checked', fieldset)?.value);

    const setButtonState = (variant) => {
      if (!variant) {
        button.disabled = true;
        button.textContent = window.theme.strings.unavailable;
      } else if (!variant.available) {
        button.disabled = true;
        button.textContent = window.theme.strings.soldOut;
      } else {
        button.disabled = false;
        button.textContent = window.theme.strings.addToCart;
      }
    };

    form.addEventListener('change', async (event) => {
      const input = event.target.closest('[data-option-input]');
      if (!input) return;
      const label = $(`[data-option-selected="${input.dataset.optionInput}"]`, root);
      $$(`[data-option-selected="${input.dataset.optionInput}"]`, root).forEach((el) => {
        el.textContent = input.value;
      });
      if (label) label.textContent = input.value;

      const options = selectedOptions();
      const variant = variants.find((v) => v.options.every((value, i) => value === options[i]));
      setButtonState(variant);
      if (!variant) return;

      variantInput.value = variant.id;
      window.history.replaceState({}, '', `${baseUrl}?variant=${variant.id}`);

      if (variant.featured_media && gallery?.goTo) {
        const slides = $$('[data-slide]', gallery);
        const index = slides.findIndex((slide) => slide.dataset.mediaId === String(variant.featured_media.id));
        if (index >= 0) gallery.goTo(index);
      }

      try {
        const response = await fetch(`${baseUrl}?variant=${variant.id}&section_id=${sectionId}`);
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const freshPrices = $$('[data-product-price]', doc);
        $$('[data-product-price]', root).forEach((el, i) => {
          if (freshPrices[i]) el.innerHTML = freshPrices[i].innerHTML;
        });
        const freshInputs = $$('[data-option-input]', doc);
        $$('[data-option-input]', root).forEach((el, i) => {
          if (freshInputs[i]) el.classList.toggle('is-unavailable', freshInputs[i].classList.contains('is-unavailable'));
        });
      } catch (e) {}
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (button.disabled) return;
      error.hidden = true;
      button.classList.add('is-loading');
      try {
        await cart.add(new FormData(form));
      } catch (err) {
        error.textContent = err.description || err.message || '';
        error.hidden = false;
      } finally {
        button.classList.remove('is-loading');
      }
    });
  };

  const initRecommendations = () => {
    $$('[data-recommendations]').forEach(async (container) => {
      if (container.children.length) return;
      try {
        const response = await fetch(container.dataset.url);
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const fresh = $('[data-recommendations]', doc);
        if (fresh && fresh.innerHTML.trim()) {
          container.innerHTML = fresh.innerHTML;
          initSliders(container);
          initCards(container);
        }
      } catch (e) {}
    });
  };

  const initFooter = () => {
    const accordions = $$('[data-footer-accordion]');
    const sync = () => accordions.forEach((el) => (desktop.matches ? el.setAttribute('open', '') : el.removeAttribute('open')));
    sync();
    desktop.addEventListener('change', sync);
    accordions.forEach((el) =>
      $('summary', el).addEventListener('click', (event) => {
        if (desktop.matches) event.preventDefault();
      })
    );

    $$('[data-read-more]').forEach((button) => {
      const target = document.getElementById(button.getAttribute('aria-controls'));
      if (!target) return;
      if (target.scrollHeight <= target.clientHeight + 2) {
        button.hidden = true;
        return;
      }
      button.addEventListener('click', () => {
        const expanded = target.classList.toggle('is-expanded');
        button.setAttribute('aria-expanded', String(expanded));
        button.textContent = expanded ? button.dataset.labelLess : button.dataset.labelMore;
      });
    });
  };

  const initCollection = () => {
    const sort = $('[data-sort-select]');
    sort?.addEventListener('change', () => sort.form.submit());

    const drawer = $('[data-filters-drawer]');
    if (drawer) {
      const toggles = $$('[data-filters-open]');
      const panel = createPanel({ element: drawer, overlay: $('[data-filters-overlay]'), toggles });
      toggles.forEach((toggle) => toggle.addEventListener('click', () => panel.open()));
      $('[data-filters-close]', drawer)?.addEventListener('click', () => panel.close());
      const form = $('[data-filters-form]', drawer);
      form?.addEventListener('submit', (event) => {
        event.preventDefault();
        const params = new URLSearchParams();
        new FormData(form).forEach((value, key) => {
          if (value !== '') params.append(key, value);
        });
        window.location.search = params.toString();
      });
    }
  };

  const initCustomer = () => {
    const login = $('[data-login-panel]');
    const recover = $('[data-recover-panel]');
    if (!login || !recover) return;
    const show = (showRecover) => {
      login.hidden = showRecover;
      recover.hidden = !showRecover;
    };
    if (window.location.hash === '#recover' || $('[data-recover-success]')) show(true);
    $$('[data-recover-toggle]').forEach((link) =>
      link.addEventListener('click', (event) => {
        event.preventDefault();
        show(recover.hidden);
      })
    );
  };

  const initStoryVideo = (root = document) => {
    $$('[data-story-video]', root).forEach((wrap) => {
      const video = $('video', wrap);
      if (!video) return;
      $('[data-story-video-toggle]', wrap)?.addEventListener('click', () => {
        const expanded = wrap.classList.toggle('is-expanded');
        video.muted = !expanded;
        video.play().catch(() => {});
      });
      $('[data-story-video-close]', wrap)?.addEventListener('click', () => {
        video.pause();
        wrap.hidden = true;
      });
    });
  };

  const initElasUsam = (root = document) => {
    $$('[data-elas-usam]', root).forEach((section) => {
      const track = $('[data-elas-track]', section);
      if (!track) return;
      const looks = $$('[data-look]', section);
      const prev = $('[data-elas-prev]', section);
      const next = $('[data-elas-next]', section);
      const current = $('[data-elas-current]', section);
      const bar = $('[data-elas-bar]', section);
      const hotspots = $$('[data-hotspot]', section);

      const closeAll = (except) => {
        hotspots.forEach((spot) => {
          if (spot === except) return;
          spot.classList.remove('is-open');
          $('[data-hotspot-toggle]', spot)?.setAttribute('aria-expanded', 'false');
        });
      };

      hotspots.forEach((spot) => {
        const toggle = $('[data-hotspot-toggle]', spot);
        toggle?.addEventListener('click', (event) => {
          event.stopPropagation();
          const open = !spot.classList.contains('is-open');
          closeAll(spot);
          spot.classList.toggle('is-open', open);
          toggle.setAttribute('aria-expanded', String(open));
        });
        if (desktop.matches) {
          spot.addEventListener('mouseenter', () => {
            closeAll(spot);
            spot.classList.add('is-open');
            toggle?.setAttribute('aria-expanded', 'true');
          });
          spot.addEventListener('mouseleave', () => {
            spot.classList.remove('is-open');
            toggle?.setAttribute('aria-expanded', 'false');
          });
        }
      });

      document.addEventListener('click', (event) => {
        if (!event.target.closest('[data-hotspot-pop]')) closeAll();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeAll();
      });

      looks.forEach((look) => {
        const spots = $$('[data-hotspot]', look);
        $$('[data-look-item]', look).forEach((item) => {
          const spot = spots.find((s) => s.dataset.spot === item.dataset.lookItem);
          if (!spot) return;
          item.addEventListener('mouseenter', () => spot.classList.add('is-highlighted'));
          item.addEventListener('mouseleave', () => spot.classList.remove('is-highlighted'));
        });
      });

      const step = () => (looks[1] ? looks[1].offsetLeft - looks[0].offsetLeft : track.clientWidth);
      prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
      next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

      let ticking = false;
      const update = () => {
        ticking = false;
        const max = track.scrollWidth - track.clientWidth;
        const ratio = max > 0 ? track.scrollLeft / max : 0;
        if (bar) {
          const width = max > 0 ? (track.clientWidth / track.scrollWidth) * 100 : 100;
          bar.style.setProperty('--elas-bar-width', `${width}%`);
          bar.style.setProperty('--elas-bar-offset', `${(ratio * (100 - width) * 100) / width}%`);
        }
        const index = Math.min(looks.length, Math.round(track.scrollLeft / (step() || 1)) + 1);
        if (current) current.textContent = String(index).padStart(2, '0');
        if (prev) prev.disabled = track.scrollLeft <= 2;
        if (next) next.disabled = track.scrollLeft >= max - 2;
      };
      track.addEventListener(
        'scroll',
        () => {
          closeAll();
          if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
          }
        },
        { passive: true }
      );
      window.addEventListener('resize', update);
      update();
    });
  };

  const initNavScroll = () => {
    const nav = $('.header__nav');
    if (!nav) return;
    const update = () => {
      const max = nav.scrollWidth - nav.clientWidth;
      nav.classList.toggle('is-overflowing', max > 1);
      nav.classList.toggle('is-at-start', nav.scrollLeft <= 1);
      nav.classList.toggle('is-at-end', nav.scrollLeft >= max - 1);
    };
    nav.addEventListener('scroll', update, { passive: true });
    nav.addEventListener(
      'wheel',
      (event) => {
        if (!nav.classList.contains('is-overflowing') || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
        event.preventDefault();
        nav.scrollLeft += event.deltaY;
      },
      { passive: false }
    );
    window.addEventListener('resize', update);
    if (document.fonts) document.fonts.ready.then(update);
    update();
  };

  const init = () => {
    initAnnouncement();
    initHeader();
    initNavScroll();
    initSearch();
    initSliders();
    initCards();
    initCart();
    $$('[data-product]').forEach(initProduct);
    initStoryVideo();
    initElasUsam();
    initRecommendations();
    initFooter();
    initCollection();
    initCustomer();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', (event) => {
    initSliders(event.target);
    initCards(event.target);
    $$('[data-product]', event.target).forEach(initProduct);
    initStoryVideo(event.target);
    initElasUsam(event.target);
    initRecommendations();
  });
})();
