/* ═══════════════════════════════════════════════════════════════════
   site.js — the motion system
   Split text · reveals · scroll engine · cursor · magnetics · marquee ·
   counters · clocks · theme (with a circular view transition) · menu ·
   page transitions · intro loader. Vanilla, no dependencies.
   Exposes window.AG for the page scripts (flies, research, publications,
   terminal) and fires a `themechange` event on window.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var d = document.documentElement;
  var reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  var fineMQ = matchMedia('(hover: hover) and (pointer: fine)');
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

  /* ── Zeitgeber time ─────────────────────────────────────────────────
     Lights on at 06:00 local = ZT0. Lights off at 18:00 = ZT12.        */
  AG.now = function () {
    var n = new Date(), h = n.getHours(), m = n.getMinutes(), s = n.getSeconds();
    var zt = ((h + m / 60 + s / 3600) - 6 + 24) % 24;
    return { h: h, m: m, zt: zt, hhmm: pad(h) + ':' + pad(m) };
  };

  /* Drosophila activity under LD 12:12: morning peak around lights-on,
     midday siesta, evening peak around lights-off, consolidated night sleep.
     Asymmetric gaussians — anticipation ramps are slower than the decay. */
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
    if (zt >= 21.5 || zt < 2.5) return { key: 'morning', name: 'Morning peak', msg: 'Lights just came on. The flies are at their busiest, and so is this page.' };
    if (zt < 8) return { key: 'siesta', name: 'Siesta', msg: 'Midday siesta: most flies are dozing. Wave your cursor to wake a few.' };
    if (zt < 13) return { key: 'evening', name: 'Evening peak', msg: 'Evening peak: activity ramps up in anticipation of dusk.' };
    return { key: 'night', name: 'Night sleep', msg: 'Lights out. The flies are asleep, mostly. Click to startle them.' };
  };

  /* ── Shared frame loop ──────────────────────────────────────────── */
  var tickers = [];
  AG.onFrame = function (fn) { tickers.push(fn); };
  var last = performance.now();
  function frame(t) {
    var dt = Math.min(64, t - last); last = t;
    for (var i = 0; i < tickers.length; i++) tickers[i](t, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ── Scroll state ───────────────────────────────────────────────── */
  var scroll = AG.scroll = { y: scrollY, v: 0, dir: 1 };
  var lastY = scrollY;
  AG.onFrame(function () {
    var y = scrollY, dy = y - lastY; lastY = y;
    scroll.y = y;
    scroll.v = lerp(scroll.v, dy, 0.18);
    if (Math.abs(dy) > 0.5) scroll.dir = dy > 0 ? 1 : -1;
  });

  /* ═══ 1. SPLIT TEXT ═════════════════════════════════════════════ */
  function textNodes(el) {
    var out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    while (w.nextNode()) out.push(w.currentNode);
    return out;
  }
  function splitWords(el, mode) {
    var idx = 0, chi = 0;
    textNodes(el).forEach(function (node) {
      var parts = node.nodeValue.split(/(\s+)/), frag = document.createDocumentFragment();
      parts.forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
        if (mode === 'scrub') {
          var s = document.createElement('span');
          s.className = 'sw'; s.textContent = p; frag.appendChild(s); return;
        }
        var wd = document.createElement('span'); wd.className = 'wd';
        if (mode === 'chars') {
          Array.from(p).forEach(function (c) {
            var ch = document.createElement('span');
            ch.className = 'ch'; ch.textContent = c; ch.style.setProperty('--i', chi++);
            wd.appendChild(ch);
          });
        } else {
          var inn = document.createElement('span');
          inn.className = 'wd__in'; inn.textContent = p; inn.style.setProperty('--i', idx);
          wd.appendChild(inn);
        }
        idx++;
        frag.appendChild(wd);
      });
      node.parentNode.replaceChild(frag, node);
    });
  }
  function hiddenFromAT(el) { return !!el.closest('[aria-hidden="true"]'); }
  $$('[data-words]').forEach(function (el) { splitWords(el, 'words'); });
  $$('[data-chars]').forEach(function (el) {
    if (!hiddenFromAT(el) && !el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.trim());
    splitWords(el, 'chars');
  });
  $$('[data-scrub]').forEach(function (el) { splitWords(el, 'scrub'); });

  /* rolling letters: two stacked copies that swap on hover */
  $$('[data-roll]').forEach(function (el) {
    var txt = el.textContent.trim(); if (!txt) return;
    var sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = txt;
    var wrap = document.createElement('span'); wrap.className = 'roll'; wrap.setAttribute('aria-hidden', 'true');
    Array.from(txt).forEach(function (c, i) {
      var cell = document.createElement('span'); cell.className = 'roll__c'; cell.style.setProperty('--i', i);
      var a = document.createElement('span'), b = document.createElement('span');
      a.textContent = b.textContent = c === ' ' ? ' ' : c;
      cell.appendChild(a); cell.appendChild(b); wrap.appendChild(cell);
    });
    el.textContent = ''; el.appendChild(sr); el.appendChild(wrap);
  });

  /* stagger children */
  $$('[data-stagger]').forEach(function (p) {
    $$('[data-reveal]', p).forEach(function (el, i) {
      if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', Math.min(i, 8) * 80);
    });
  });

  /* ═══ 2. REVEALS ═══════════════════════════════════════════════ */
  var inviewSel = '[data-reveal],[data-words],[data-chars],[data-inview],.eyebrow';
  var revealIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
      if (e.target.hasAttribute('data-count')) countUp(e.target);
      $$('[data-count]', e.target).forEach(countUp);
    });
  }, { rootMargin: '0px 0px -7% 0px', threshold: 0 }) : null;

  function startReveals() {
    var els = $$(inviewSel);
    if (!revealIO || reduceMQ.matches) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      $$('[data-count]').forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    els.forEach(function (el) { revealIO.observe(el); });
    $$('[data-count]').forEach(function (el) { if (!el.closest(inviewSel)) revealIO.observe(el); });
  }

  /* ═══ 3. COUNTERS ══════════════════════════════════════════════ */
  function countUp(el) {
    if (el._counted) return; el._counted = true;
    var to = parseInt(el.getAttribute('data-count'), 10) || 0;
    var p = parseInt(el.getAttribute('data-pad') || '0', 10);
    var fmt = function (n) { var s = String(n); while (s.length < p) s = '0' + s; return s; };
    if (reduceMQ.matches || !to) { el.textContent = fmt(to); return; }
    var t0 = performance.now(), dur = 1700 + to * 20;
    (function step(t) {
      var k = clamp((t - t0) / dur, 0, 1);
      var e = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
      el.textContent = fmt(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
    el.textContent = fmt(0);
  }

  /* ═══ 4. SCROLL ENGINE ═════════════════════════════════════════ */
  var live = new Set();
  var liveIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) live.add(e.target); else live.delete(e.target); });
  }, { rootMargin: '20% 0px 20% 0px' }) : null;
  $$('[data-scrub],[data-progress],[data-parallax],[data-rotate-scroll]').forEach(function (el) {
    if (liveIO) liveIO.observe(el); else live.add(el);
  });

  function updateScrollFx() {
    var vh = innerHeight;
    live.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (el.hasAttribute('data-scrub')) {
        var words = el._sw || (el._sw = $$('.sw', el));
        var p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.32), 0, 1);
        var lit = Math.round(p * words.length * 1.08);
        if (el._lit !== lit) {
          el._lit = lit;
          for (var i = 0; i < words.length; i++) words[i].classList.toggle('is-lit', i < lit);
        }
      }
      if (el.hasAttribute('data-progress')) {
        var pp = clamp((vh * 0.62 - r.top) / r.height, 0, 1);
        el.style.setProperty('--p', pp.toFixed(4));
        $$('[data-progress-item]', el).forEach(function (it) {
          it.classList.toggle('is-active', it.getBoundingClientRect().top < vh * 0.62);
        });
      }
      if (el.hasAttribute('data-parallax')) {
        var sp = parseFloat(el.getAttribute('data-parallax')) || 0.15;
        el.style.transform = 'translate3d(0,' + ((r.top + r.height / 2 - vh / 2) * -sp).toFixed(1) + 'px,0)';
      }
      if (el.hasAttribute('data-rotate-scroll')) {
        var k = parseFloat(el.getAttribute('data-rotate-scroll')) || 0.05;
        el.style.setProperty('--rot', (scroll.y * k).toFixed(2) + 'deg');
      }
    });
  }
  if (reduceMQ.matches) {
    $$('.sw').forEach(function (w) { w.classList.add('is-lit'); });
    $$('[data-progress]').forEach(function (el) { el.style.setProperty('--p', 1); });
    $$('[data-progress-item]').forEach(function (el) { el.classList.add('is-active'); });
  } else {
    var lastFxY = -1, lastFxH = -1;
    AG.onFrame(function () {
      if (scroll.y === lastFxY && innerHeight === lastFxH && !AG._fxDirty) return;
      lastFxY = scroll.y; lastFxH = innerHeight; AG._fxDirty = false;
      updateScrollFx();
    });
  }

  /* ═══ 5. NAV ═══════════════════════════════════════════════════ */
  var nav = $('[data-nav]');
  var menuOpen = false;
  if (nav) {
    AG.onFrame(function () {
      nav.classList.toggle('is-scrolled', scroll.y > 24);
      var hide = !menuOpen && scroll.y > innerHeight * 0.6 && scroll.v > 1.5;
      var show = scroll.v < -1.5 || scroll.y < innerHeight * 0.6 || menuOpen;
      if (hide) nav.classList.add('is-hidden'); else if (show) nav.classList.remove('is-hidden');
    });
    nav.addEventListener('focusin', function () { nav.classList.remove('is-hidden'); });
  }
  var links = $('[data-navlinks]');
  if (links) {
    var hov = $('.nav__hover', links);
    $$('.nav__link', links).forEach(function (a) {
      a.addEventListener('mouseenter', function () {
        if (a.getAttribute('aria-current')) { links.classList.remove('is-hovering'); return; }
        hov.style.width = a.offsetWidth + 'px';
        hov.style.transform = 'translateX(' + a.offsetLeft + 'px)';
        links.classList.add('is-hovering');
      });
    });
    links.addEventListener('mouseleave', function () { links.classList.remove('is-hovering'); });
  }

  /* mobile menu */
  var menu = $('[data-menu]'), menuBtn = $('[data-menu-toggle]');
  function setMenu(open) {
    if (!menu) return;
    menuOpen = open;
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    $('span', menuBtn).textContent = open ? 'Close' : 'Menu';
    document.body.style.overflow = open ? 'hidden' : '';
    if ('inert' in menu) menu.inert = !open;
    if (open) setTimeout(function () { var a = $('.menu__link', menu); if (a) a.focus({ preventScroll: true }); }, 400);
  }
  if (menu && menuBtn) {
    if ('inert' in menu) menu.inert = true;
    menuBtn.addEventListener('click', function () { setMenu(!menuOpen); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); menuBtn.focus(); } });
    addEventListener('resize', function () { if (menuOpen && innerWidth > 860) setMenu(false); });
  }

  /* ═══ 6. CLOCKS ════════════════════════════════════════════════ */
  var tzFmt = {};
  function updateClocks() {
    var n = AG.now(), zt = Math.floor(n.zt);
    $$('[data-clock]').forEach(function (el) {
      el.innerHTML = el.closest('.menu') ? n.hhmm + ' · ZT' + pad(zt) : n.hhmm + ' · <b>ZT' + pad(zt) + '</b>';
    });
    $$('[data-clock-short]').forEach(function (el) { el.textContent = n.hhmm; });
    $$('[data-tz-clock]').forEach(function (el) {
      var tz = el.getAttribute('data-tz');
      try {
        tzFmt[tz] = tzFmt[tz] || new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
        el.textContent = tzFmt[tz].format(new Date());
        /* a visitor in the same timezone doesn't need the time twice */
        var box = el.parentNode, same = el.textContent === n.hhmm;
        var you = $('[data-tz-you]', box), sm = $('[data-tz-same]', box);
        if (you && sm) { you.hidden = same; sm.hidden = !same; }
      } catch (e) { el.textContent = '—'; }
    });
    $$('[data-dial-mark]').forEach(function (svg) {
      var h = $('.mk-hand', svg); if (h) h.style.setProperty('--hand', (n.zt * 15).toFixed(1) + 'deg');
    });
    /* follow the sun if the visitor hasn't chosen a theme */
    var pref = null; try { pref = localStorage.getItem('ag-theme'); } catch (e) {}
    if (!pref) {
      var want = (n.h >= 6 && n.h < 18) ? 'light' : 'dark';
      if (d.getAttribute('data-theme') !== want) AG.setTheme(want, null, true);
    }
  }

  /* ═══ 7. THEME ═════════════════════════════════════════════════ */
  var metaTheme = $('meta[name="theme-color"]');
  function paintMeta() {
    if (metaTheme) metaTheme.setAttribute('content', getComputedStyle(d).getPropertyValue('--bg').trim() || '#0a0c11');
  }
  AG.setTheme = function (t, origin, auto) {
    if (t === 'auto') {
      try { localStorage.removeItem('ag-theme'); } catch (e) {}
      var h = new Date().getHours(); t = (h >= 6 && h < 18) ? 'light' : 'dark';
      auto = true;
    }
    if (t === d.getAttribute('data-theme')) return;
    var apply = function () {
      d.setAttribute('data-theme', t);
      if (!auto) { try { localStorage.setItem('ag-theme', t); } catch (e) {} }
      paintMeta();
      dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }));
    };
    if (!document.startViewTransition || reduceMQ.matches || !origin) { apply(); return; }
    var x = origin.x, y = origin.y;
    var rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    d.classList.add('theme-vt');
    var vt = document.startViewTransition(apply);
    vt.ready.then(function () {
      d.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 950, easing: 'cubic-bezier(.76,0,.24,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(function () {});
    vt.finished.finally(function () { d.classList.remove('theme-vt'); });
  };
  $$('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      var r = b.getBoundingClientRect();
      var o = e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      AG.setTheme(d.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', o);
    });
  });

  /* ═══ 8. CURSOR ════════════════════════════════════════════════ */
  var cursor = $('.cursor');
  var ptr = AG.pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false };
  addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.active = true;
  }, { passive: true });
  if (cursor && fineMQ.matches && !reduceMQ.matches) {
    d.classList.add('has-cursor');
    var dot = $('.cursor__dot', cursor), ring = $('.cursor__ring', cursor), label = $('.cursor__label', cursor);
    var rx = ptr.x, ry = ptr.y;
    /* Stay hidden until the mouse actually moves, then appear under it */
    cursor.classList.add('is-out');
    addEventListener('pointermove', function first(e) {
      if (e.pointerType === 'touch') return;
      rx = e.clientX; ry = e.clientY;
      cursor.classList.remove('is-out');
      removeEventListener('pointermove', first);
    }, { passive: true });
    AG.onFrame(function () {
      rx = lerp(rx, ptr.x, 0.2); ry = lerp(ry, ptr.y, 0.2);
      dot.style.transform = 'translate3d(' + ptr.x + 'px,' + ptr.y + 'px,0)';
      ring.style.transform = 'translate3d(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0)';
    });
    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      var lab = t.closest('[data-cursor-label]');
      var txt = t.closest('input[type="search"],input[type="text"],textarea,.term');
      var lnk = t.closest('a,button,label,input[type="range"],[data-cursor]');
      cursor.classList.toggle('is-label', !!lab);
      cursor.classList.toggle('is-text', !!txt && !lab);
      cursor.classList.toggle('is-link', !!lnk && !lab && !txt);
      if (lab) label.textContent = lab.getAttribute('data-cursor-label');
    });
    document.addEventListener('mousedown', function () { cursor.classList.add('is-down'); });
    document.addEventListener('mouseup', function () { cursor.classList.remove('is-down'); });
    document.documentElement.addEventListener('mouseleave', function () { cursor.classList.add('is-out'); });
    document.documentElement.addEventListener('mouseenter', function () { cursor.classList.remove('is-out'); });
  }

  /* ═══ 9. MAGNETIC · TILT ═══════════════════════════════════════ */
  if (fineMQ.matches && !reduceMQ.matches) {
    $$('[data-magnetic]').forEach(function (el) {
      var inner = el.querySelector('.btn__arrow');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2), my = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (mx * 0.28).toFixed(1) + 'px,' + (my * 0.38).toFixed(1) + 'px)';
        if (inner) inner.style.translate = (mx * 0.12).toFixed(1) + 'px ' + (my * 0.16).toFixed(1) + 'px';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transform = '';
        if (inner) inner.style.translate = '';
      });
    });
    $$('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.classList.add('is-tilting');
        el.style.setProperty('--ry', ((px - 0.5) * 7).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - py) * 6).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ═══ 10. MARQUEE ══════════════════════════════════════════════ */
  $$('[data-marquee]').forEach(function (m) {
    var track = $('[data-marquee-track]', m);
    if (!track || reduceMQ.matches || !track.animate) return;
    var anim = null, rate = 1, visible = false;
    function build() {
      var w = track.scrollWidth / 2;
      var t = anim ? anim.currentTime : 0;
      if (anim) anim.cancel();
      anim = track.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(' + (-w) + 'px,0,0)' }],
        { duration: w / 70 * 1000, iterations: Infinity });
      anim.currentTime = t || 0;
      if (!visible) anim.pause();
    }
    build();
    var rw; addEventListener('resize', function () { clearTimeout(rw); rw = setTimeout(build, 200); });
    if (document.fonts) document.fonts.ready.then(build);
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (anim) { if (visible) anim.play(); else anim.pause(); }
    }).observe(m);
    var items = $$('.marquee__item', m), skew = 0;
    AG.onFrame(function () {
      if (!visible || !anim) return;
      var target = scroll.dir * (1 + Math.min(Math.abs(scroll.v) * 0.22, 7));
      rate = lerp(rate, target, 0.08);
      anim.playbackRate = rate;
      var s = clamp(-scroll.v * 0.35, -10, 10);
      if (Math.abs(s - skew) > 0.05) {
        skew = lerp(skew, s, 0.15);
        m.style.setProperty('--skew', skew.toFixed(2) + 'deg');
        for (var i = 0; i < items.length; i++) items[i].style.setProperty('--skew', skew.toFixed(2) + 'deg');
      }
    });
  });

  /* ═══ 11. PORTRAIT RING (a 24h clock face around the photo) ═══ */
  $$('[data-ring]').forEach(function (svg) {
    var ns = 'http://www.w3.org/2000/svg', c = 200, r0 = 192, html = '';
    for (var i = 0; i < 96; i++) {
      var a = i / 96 * Math.PI * 2, major = i % 4 === 0, big = i % 24 === 0;
      var r1 = big ? 176 : major ? 182 : 186;
      html += '<line' + (big ? ' class="major"' : '') + ' x1="' + (c + Math.sin(a) * r0).toFixed(2) + '" y1="' + (c - Math.cos(a) * r0).toFixed(2) +
        '" x2="' + (c + Math.sin(a) * r1).toFixed(2) + '" y2="' + (c - Math.cos(a) * r1).toFixed(2) + '" stroke-width="' + (big ? 1.4 : 1) + '"/>';
    }
    ['00', '06', '12', '18'].forEach(function (lbl, k) {
      var a = k * Math.PI / 2, rr = 160;
      html += '<text x="' + (c + Math.sin(a) * rr).toFixed(1) + '" y="' + (c - Math.cos(a) * rr + 4).toFixed(1) + '" text-anchor="middle">' + lbl + '</text>';
    });
    var n = AG.now(), sa = (n.h + n.m / 60) / 24 * Math.PI * 2;
    html += '<circle class="pr-sun" cx="' + (c + Math.sin(sa) * r0).toFixed(2) + '" cy="' + (c - Math.cos(sa) * r0).toFixed(2) + '" r="6"/>';
    svg.innerHTML = html;
    void ns;
  });

  /* ═══ 12. HERO NAME — variable-font proximity + idle breathing ═ */
  $$('[data-proximity]').forEach(function (host) {
    var chars = $$('.ch', host);
    if (!chars.length || reduceMQ.matches) return;
    var centers = [], visible = true, start = performance.now() + 1600;
    function measure() {
      centers = chars.map(function (c) {
        var r = c.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 + scroll.y };
      });
    }
    addEventListener('resize', measure);
    if (document.fonts) document.fonts.ready.then(measure);
    setTimeout(measure, 1800);
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(host);
    var cur = chars.map(function () { return 0; });
    AG.onFrame(function (t) {
      if (!visible || t < start || !centers.length) return;
      var radius = Math.max(220, innerWidth * 0.2);
      for (var i = 0; i < chars.length; i++) {
        var c = centers[i];
        var breath = 0.5 + 0.5 * Math.sin((t - start) * 0.0011 - i * 0.55);
        var target = breath * 0.28;
        if (ptr.active) {
          var dx = ptr.x - c.x, dy = ptr.y - (c.y - scroll.y);
          var w = clamp(1 - Math.sqrt(dx * dx + dy * dy) / radius, 0, 1);
          target = Math.max(target, w * w * (3 - 2 * w));
        }
        cur[i] = lerp(cur[i], target, 0.09);
        var k = cur[i];
        chars[i].style.fontVariationSettings = '"opsz" 144, "wght" ' + (300 + k * 520).toFixed(0) + ', "SOFT" ' + (k * 100).toFixed(0) + ', "WONK" ' + (k > 0.6 ? 1 : 0);
      }
    });
  });

  /* ═══ 13. PAGE TRANSITIONS ═════════════════════════════════════
     Cross-document view transitions where supported (circular reveal
     from the click, see site.css); a curtain wipe everywhere else.    */
  var curtain = $('.curtain');
  var hasVT = 'PageRevealEvent' in window;
  function internal(a) {
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(href)) return false;
    if (a.origin !== location.origin) return false;
    if (a.pathname === location.pathname && a.hash) return false;
    return /\.html$|\/$/.test(a.pathname);
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a');
    if (!internal(a)) return;
    try { sessionStorage.setItem('ag-vt', JSON.stringify({ x: e.clientX || innerWidth / 2, y: e.clientY || innerHeight / 2, t: Date.now() })); } catch (_) {}
    if (menuOpen) setMenu(false);
    if (hasVT || reduceMQ.matches || !curtain || location.protocol === 'file:') return;
    e.preventDefault();
    try { sessionStorage.setItem('ag-curtain', '1'); } catch (_) {}
    curtain.classList.add('is-leaving');
    setTimeout(function () { location.href = a.href; }, 560);
  });
  addEventListener('pageshow', function (e) {
    if (e.persisted && curtain) curtain.classList.remove('is-leaving');
  });

  /* ═══ 14. SMALL THINGS ═════════════════════════════════════════ */
  $$('[data-top]').forEach(function (b) {
    b.addEventListener('click', function () { scrollTo({ top: 0, behavior: reduceMQ.matches ? 'auto' : 'smooth' }); });
  });
  $$('[data-copy]').forEach(function (b) {
    var lbl = $('[data-copy-label]', b) || b, orig = lbl.textContent;
    b.addEventListener('click', function () {
      var done = function () { lbl.textContent = 'Copied ✓'; setTimeout(function () { lbl.textContent = orig; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(b.getAttribute('data-copy')).then(done, function () { lbl.textContent = b.getAttribute('data-copy'); });
      else lbl.textContent = b.getAttribute('data-copy');
    });
  });
  $$('[data-nf-path]').forEach(function (el) { el.textContent = '$ curl ' + location.pathname + '  →  404'; });

  /* A command types itself out once it scrolls into view, then answers */
  $$('[data-shell]').forEach(function (sh) {
    var el = $('[data-shell-type]', sh);
    if (!el) return;
    var full = el.textContent;
    if (reduceMQ.matches) { sh.classList.add('is-done'); return; }
    var sr = document.createElement('span');
    sr.className = 'sr-only'; sr.textContent = full;
    el.parentNode.insertBefore(sr, el);
    el.setAttribute('aria-hidden', 'true');
    el.textContent = '';
    function type() {
      var i = 0;
      (function tick() {
        el.textContent = full.slice(0, ++i);
        if (i < full.length) setTimeout(tick, full[i] === ' ' ? 90 : 34 + Math.random() * 56);
        else setTimeout(function () { sh.classList.add('is-done'); }, 280);
      })();
    }
    if (!('IntersectionObserver' in window)) { type(); return; }
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      setTimeout(type, 450);
    }, { threshold: 0.6 });
    io.observe(sh);
  });

  /* ═══ 15. INTRO LOADER, then GO ═════════════════════════════════ */
  function go() {
    d.classList.add('ready');
    startReveals();
    if (d.classList.contains('curtain-in') && curtain) {
      requestAnimationFrame(function () {
        curtain.classList.add('is-lifting');
        setTimeout(function () { d.classList.remove('curtain-in'); curtain.classList.remove('is-lifting'); }, 800);
      });
    }
  }
  function intro(done) {
    var loader = $('[data-loader]');
    if (!d.classList.contains('intro') || !loader || reduceMQ.matches) { d.classList.remove('intro'); done(); return; }
    var timeEl = $('[data-loader-time]', loader), wave = $('[data-loader-wave]', loader);
    var pts = [];
    for (var i = 0; i <= 140; i++) {
      var x = i / 140 * 560;
      pts.push((i ? 'L' : 'M') + x.toFixed(1) + ' ' + (30 - Math.sin(i / 140 * Math.PI * 4 - Math.PI / 2) * -22).toFixed(2));
    }
    wave.setAttribute('d', pts.join(''));
    var n = AG.now(), target = n.h * 60 + n.m, t0 = performance.now(), dur = 1500;
    d.classList.add('ready');
    (function step(t) {
      var k = clamp((t - t0) / dur, 0, 1);
      var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      var mins = Math.round(target * e);
      timeEl.textContent = pad(Math.floor(mins / 60)) + ':' + pad(mins % 60);
      wave.style.strokeDashoffset = (1 - e).toFixed(4);
      if (k < 1) { requestAnimationFrame(step); return; }
      setTimeout(function () {
        loader.classList.add('is-out');
        setTimeout(done, 380);
        setTimeout(function () { d.classList.remove('intro'); }, 1150);
      }, 260);
    })(t0);
  }

  paintMeta();
  updateClocks();
  setInterval(updateClocks, 15000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) updateClocks(); });
  intro(go);
})();
