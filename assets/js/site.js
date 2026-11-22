/* ═══════════════════════════════════════════════════════════════════
   site.js — Quiet core utilities: clocks, day/night theme, mobile menu.
   Exposes window.AG for page figures, publication search, and terminal.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var d = document.documentElement;
  var reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  var AG = window.AG = window.AG || {};
  AG.$ = $; AG.$$ = $$; AG.clamp = clamp; AG.lerp = lerp; AG.pad = pad;
  AG.reduced = function () { return reduceMQ.matches; };
  AG.data = {};
  try { AG.data = JSON.parse($('#ag-data').textContent); } catch (e) {}

  /* ── Zeitgeber time (lights on at 06:00 = ZT0, lights off at 18:00 = ZT12) */
  AG.now = function () {
    var n = new Date(), h = n.getHours(), m = n.getMinutes(), s = n.getSeconds();
    var zt = ((h + m / 60 + s / 3600) - 6 + 24) % 24;
    return { h: h, m: m, zt: zt, hhmm: pad(h) + ':' + pad(m) };
  };

  /* Canonical Drosophila bimodal LD 12:12 activity curve */
  function ag(x, c, sl, sr) {
    var dx = ((x - c + 36) % 24) - 12;
    var s = dx < 0 ? sl : sr;
    return Math.exp(-(dx * dx) / (2 * s * s));
  }
  AG.activity = function (zt) {
    var a = 0.78 * ag(zt, 0.3, 1.5, 1.2) + 1.0 * ag(zt, 11.2, 2.2, 0.9);
    var light = zt < 12 ? 0.07 : 0.025;
    return clamp(a + light, 0, 1);
  };
  AG.phase = function (zt) {
    if (zt >= 21.5 || zt < 2.5) return { key: 'morning', name: 'Morning peak', msg: 'Dawn anticipation and lights-on activity.' };
    if (zt < 8) return { key: 'siesta', name: 'Midday siesta', msg: 'Daytime rest between morning and evening peaks.' };
    if (zt < 13) return { key: 'evening', name: 'Evening peak', msg: 'Activity ramps up ahead of dusk.' };
    return { key: 'night', name: 'Night sleep', msg: 'Consolidated nighttime sleep.' };
  };

  /* ── Shared animation frame loop (only runs if a figure registers a ticker) */
  var tickers = [];
  var running = false;
  var last = performance.now();
  function frame(t) {
    var dt = Math.min(64, t - last); last = t;
    for (var i = 0; i < tickers.length; i++) tickers[i](t, dt);
    if (tickers.length) requestAnimationFrame(frame);
    else running = false;
  }
  AG.onFrame = function (fn) {
    tickers.push(fn);
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  };

  /* Pointer coordinates (used by 404 canvas if present) */
  var ptr = AG.pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false };
  addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.active = true;
  }, { passive: true });

  /* ── Mobile menu ──────────────────────────────────────────────────── */
  var menu = $('[data-menu]'), menuBtn = $('[data-menu-toggle]');
  var menuOpen = false, menuInert = [], menuOverflow = '';
  function menuTargets() {
    return [menuBtn].concat($$('a[href], button, input, select, textarea, [tabindex]', menu).filter(function (el) {
      return !el.disabled && el.tabIndex >= 0 && el.getClientRects().length;
    }));
  }
  function isolateMenu(parent) {
    Array.prototype.forEach.call(parent.children, function (el) {
      if (el === menu || el === menuBtn) return;
      if (el.contains(menu) || el.contains(menuBtn)) isolateMenu(el);
      else {
        menuInert.push({ el: el, was: el.inert });
        el.inert = true;
      }
    });
  }
  function setMenu(open) {
    if (!menu || !menuBtn || open === menuOpen) return;
    menuOpen = open;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    $('span', menuBtn).textContent = open ? 'Close' : 'Menu';
    if (open) {
      menuOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      isolateMenu(document.body);
      var targets = menuTargets();
      (targets[1] || menuBtn).focus({ preventScroll: true });
    } else {
      menuInert.forEach(function (entry) { entry.el.inert = entry.was; });
      menuInert = [];
      document.body.style.overflow = menuOverflow;
      var back = innerWidth > 860 ? $('.nav__link[aria-current="page"]') || $('.nav__brand') : menuBtn;
      if (back) back.focus({ preventScroll: true });
    }
  }
  if (menu && menuBtn) {
    menuBtn.addEventListener('click', function () { setMenu(!menuOpen); });
    addEventListener('keydown', function (e) {
      if (!menuOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); setMenu(false); }
      else if (e.key === 'Tab') {
        var targets = menuTargets(), index = targets.indexOf(document.activeElement);
        var next = index < 0 ? 0 : (index + (e.shiftKey ? -1 : 1) + targets.length) % targets.length;
        e.preventDefault();
        targets[next].focus({ preventScroll: true });
      }
    });
    document.addEventListener('focusin', function (e) {
      if (menuOpen && e.target !== menuBtn && !menu.contains(e.target)) {
        var targets = menuTargets();
        (targets[1] || menuBtn).focus({ preventScroll: true });
      }
    });
    addEventListener('resize', function () {
      if (menuOpen && innerWidth > 860) setMenu(false);
    });
  }

  /* ── Theme toggle ─────────────────────────────────────────────────── */
  var metaTheme = $('meta[name="theme-color"]');
  function paintMeta() {
    if (metaTheme) metaTheme.setAttribute('content', getComputedStyle(d).getPropertyValue('--bg').trim() || '#faf7f1');
  }
  AG.setTheme = function (t) {
    var auto = false;
    if (t === 'auto') {
      try { localStorage.removeItem('ag-theme'); } catch (e) {}
      var h = new Date().getHours();
      t = (h >= 6 && h < 18) ? 'light' : 'dark';
      auto = true;
    }
    if (t !== 'light' && t !== 'dark') return;
    d.setAttribute('data-theme', t);
    if (!auto) { try { localStorage.setItem('ag-theme', t); } catch (e) {} }
    paintMeta();
    dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }));
  };
  $$('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      AG.setTheme(d.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  });

  /* ── Clocks ───────────────────────────────────────────────────────── */
  var tzFmt = {};
  function updateClocks() {
    var n = AG.now(), zt = Math.floor(n.zt), ztm = Math.floor((n.zt - zt) * 60);
    $$('[data-clock]').forEach(function (el) {
      el.innerHTML = el.closest('.menu') ? n.hhmm + ' · ZT' + pad(zt) : n.hhmm + ' · <b>ZT' + pad(zt) + '</b>';
    });
    $$('[data-clock-short]').forEach(function (el) { el.textContent = n.hhmm; });
    $$('[data-tz-clock]').forEach(function (el) {
      var tz = el.getAttribute('data-tz');
      try {
        tzFmt[tz] = tzFmt[tz] || new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
        el.textContent = tzFmt[tz].format(new Date());
        var box = el.parentNode, same = el.textContent === n.hhmm;
        var you = $('[data-tz-you]', box), sm = $('[data-tz-same]', box);
        if (you && sm) { you.hidden = same; sm.hidden = !same; }
      } catch (e) { el.textContent = '—'; }
    });
    $$('[data-dial-mark]').forEach(function (svg) {
      var h = $('.mk-hand', svg);
      if (h) h.style.setProperty('--hand', (n.zt * 15).toFixed(1) + 'deg');
    });
    $$('[data-zt-marker]').forEach(function (el) {
      el.style.setProperty('--zt-position', (n.zt / 24 * 100).toFixed(3) + '%');
      el.setAttribute('title', 'Current Zeitgeber time: ZT ' + pad(zt) + ':' + pad(ztm));
    });
    $$('[data-zt-label]').forEach(function (el) {
      el.textContent = 'Current local Zeitgeber time: ZT ' + pad(zt) + ':' + pad(ztm);
    });
  }

  /* ── Small utilities (back to top, copy email, 404 path) ─────────── */
  $$('[data-top]').forEach(function (b) {
    b.addEventListener('click', function () {
      scrollTo({ top: 0, behavior: reduceMQ.matches ? 'auto' : 'smooth' });
    });
  });
  $$('[data-copy]').forEach(function (b) {
    var lbl = $('[data-copy-label]', b) || b, orig = lbl.textContent;
    b.addEventListener('click', function () {
      var done = function () {
        lbl.textContent = 'copied ✓';
        setTimeout(function () { lbl.textContent = orig; }, 1800);
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(b.getAttribute('data-copy')).then(done, function () {
          lbl.textContent = b.getAttribute('data-copy');
        });
      } else {
        lbl.textContent = b.getAttribute('data-copy');
      }
    });
  });
  $$('[data-nf-path]').forEach(function (el) {
    el.textContent = location.pathname;
  });

  d.classList.add('ready');
  paintMeta();
  updateClocks();
  setInterval(updateClocks, 20000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) updateClocks();
  });
})();
