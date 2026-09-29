/* ═══════════════════════════════════════════════════════════════════
   research.js — two living figures
   Fig. 2  A double-plotted actogram, recorded row by row as you scroll.
           Seven days in LD 12:12, then constant darkness where the
           rhythm free-runs with period τ (the slider).
   Fig. 3  A four-state hidden Markov model of sleep. The hidden chain
           steps in real time; the observable activity counts sit above
           the inferred hypnogram, and each transition pulses through
           the state diagram.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var AG = window.AG;
  if (!AG) return;
  var d = document.documentElement;
  var reduced = AG.reduced(), clamp = AG.clamp, lerp = AG.lerp;
  var mono = '500 9px "JetBrains Mono", ui-monospace, monospace';

  var C = {};
  function readColors() {
    var cs = getComputedStyle(d);
    ['--ink', '--ink-2', '--ink-3', '--ink-4', '--shade', '--sun', '--dusk', '--line', '--line-2', '--bg-2'].forEach(function (k) {
      C[k.slice(2)] = cs.getPropertyValue(k).trim();
    });
  }
  readColors();

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function fit(cv, h) {
    var w = Math.max(10, cv.clientWidth), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: w, h: h, ctx: ctx };
  }
  function watch(el, fn) {
    if ('ResizeObserver' in window) {
      var lastW = 0;
      new ResizeObserver(function () { var w = el.clientWidth; if (w !== lastW) { lastW = w; fn(); } }).observe(el);
    } else addEventListener('resize', fn);
  }

  /* ═══ FIG. 2 — ACTOGRAM ═════════════════════════════════════════ */
  (function actogram() {
    var cv = document.querySelector('[data-actogram]');
    if (!cv || !cv.getContext) return;
    var slider = document.querySelector('[data-tau]'), out = document.querySelector('[data-tau-out]'), cap = document.querySelector('[data-acto-cap]');
    var capDefault = cap ? cap.innerHTML : '';
    var DAYS = 14, LD = 7, BINS = 48, ONSET = 8.5;
    var rnd = mulberry32(0x0c10c);
    var noise = [], spor = [];
    for (var dd = 0; dd <= DAYS; dd++) {
      noise[dd] = []; spor[dd] = [];
      for (var b = 0; b < BINS; b++) { noise[dd][b] = rnd(); spor[dd][b] = rnd() < 0.04 ? 0.2 + rnd() * 0.45 : 0; }
    }
    var tau = slider ? parseFloat(slider.value) : 23.5, tauShown = tau;
    var rows = reduced ? DAYS : 0, rowsTarget = reduced ? DAYS : 0, hover = -1, dirty = true, geo = null;
    var G = { L: 24, R: 30, T: 24, B: 22 };

    function drift(day, t) { return day < LD ? 0 : (day - (LD - 1)) * (t - 24); }
    function value(day, bin, t) {
      var ld = day < LD, zt = bin / 2 + 0.25;
      var a = AG.activity((((zt - drift(day, t)) % 24) + 24) % 24);
      if (!ld) a = (a - (zt < 12 ? 0.07 : 0)) * 0.85 + 0.03;
      var v = a * (0.42 + 1.0 * noise[day][bin]) + spor[day][bin] * (a < 0.2 ? 1 : 0.3);
      if (ld && (bin === 0 || bin === 24)) v += 0.5; /* startle at lights-on / lights-off */
      return clamp(v, 0, 1.1);
    }

    function layout() {
      var w = cv.clientWidth, rowH = Math.round(clamp(w * 0.034, 13, 22));
      geo = fit(cv, G.T + DAYS * rowH + G.B);
      geo.rowH = rowH; geo.pw = geo.w - G.L - G.R;
      dirty = true;
    }

    function draw() {
      var c = geo.ctx, w = geo.w, h = geo.h, rowH = geo.rowH, pw = geo.pw, x0 = G.L, binW = pw / (BINS * 2);
      c.clearRect(0, 0, w, h);

      /* LD bar */
      var q = pw / 4;
      c.fillStyle = C.sun; c.fillRect(x0, 6, q, 5); c.fillRect(x0 + 2 * q, 6, q, 5);
      c.fillStyle = C['ink-3']; c.fillRect(x0 + q, 6, q, 5); c.fillRect(x0 + 3 * q, 6, q, 5);

      for (var r = 0; r < DAYS; r++) {
        var prog = clamp(rows - r, 0, 1);
        var y = G.T + r * rowH;
        c.font = mono; c.textBaseline = 'middle'; c.textAlign = 'right';
        c.fillStyle = r === hover ? C.sun : C['ink-3'];
        c.globalAlpha = prog > 0 ? 1 : 0.35;
        c.fillText(String(r + 1), x0 - 8, y + rowH / 2);
        c.globalAlpha = 1;
        if (prog <= 0) continue;

        c.save();
        c.beginPath(); c.rect(x0, y, pw * prog, rowH); c.clip();
        if (r === hover) { c.fillStyle = C.sun; c.globalAlpha = 0.1; c.fillRect(x0, y, pw, rowH); c.globalAlpha = 1; }
        for (var half = 0; half < 2; half++) {
          var day = r + half, xs = x0 + half * pw / 2;
          c.fillStyle = C.shade;
          if (day < LD) c.fillRect(xs + pw / 4, y, pw / 4, rowH);
          else c.fillRect(xs, y, pw / 2, rowH);
          c.fillStyle = r === hover ? C.sun : C.ink;
          for (var bb = 0; bb < BINS; bb++) {
            var v = value(day, bb, tauShown);
            if (v < 0.02) continue;
            var bh = v * (rowH - 3);
            c.fillRect(xs + bb * binW, y + rowH - bh, Math.max(1, binW - 0.7), bh);
          }
        }
        c.fillStyle = C.line; c.fillRect(x0, y + rowH - 0.5, pw, 0.5);
        /* the recording pen */
        if (prog < 1) { c.fillStyle = C.sun; c.fillRect(x0 + pw * prog - 1, y, 2, rowH); }
        c.restore();
      }

      /* evening-onset guide: a vertical in LD that tilts in DD */
      if (rows > 1) {
        c.save();
        c.beginPath(); c.rect(x0, G.T, pw, Math.min(rows, DAYS) * rowH); c.clip();
        c.strokeStyle = C.dusk; c.lineWidth = 1.25; c.setLineDash([3, 3]);
        for (var hh = 0; hh < 2; hh++) {
          c.beginPath();
          for (var rr = 0; rr < DAYS; rr++) {
            var hx = x0 + (ONSET + drift(rr + hh, tauShown) + hh * 24) / 48 * pw;
            var hy = G.T + rr * rowH + rowH / 2;
            if (rr) c.lineTo(hx, hy); else c.moveTo(hx, hy);
          }
          c.stroke();
        }
        c.restore();
      }

      /* LD / DD brackets */
      c.setLineDash([]);
      c.strokeStyle = C['ink-3']; c.lineWidth = 1; c.fillStyle = C['ink-2']; c.textAlign = 'left'; c.font = mono;
      var bx = x0 + pw + 8;
      [[0, LD, 'LD'], [LD, DAYS, 'DD']].forEach(function (s) {
        var ya = G.T + s[0] * rowH + 2, yb = G.T + s[1] * rowH - 2;
        c.globalAlpha = rows > s[0] ? 1 : 0.3;
        c.beginPath(); c.moveTo(bx, ya); c.lineTo(bx + 4, ya); c.lineTo(bx + 4, yb); c.lineTo(bx, yb); c.stroke();
        c.save(); c.translate(bx + 16, (ya + yb) / 2); c.rotate(Math.PI / 2); c.textAlign = 'center'; c.fillText(s[2], 0, 0); c.restore();
      });
      c.globalAlpha = 1;

      /* ZT axis */
      c.fillStyle = C['ink-3']; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      for (var t = 0; t <= 48; t += 12) {
        var tx = x0 + t / 48 * pw;
        c.fillRect(tx - 0.5, G.T + DAYS * rowH, 1, 4);
        c.textAlign = t === 0 ? 'left' : t === 48 ? 'right' : 'center';
        c.fillText(t === 0 ? 'ZT 0' : String(t), tx, h - 4);
      }
    }

    function setTau(v) {
      tau = v;
      if (out) out.innerHTML = v.toFixed(1) + '<small>h</small>';
      if (slider) slider.style.setProperty('--fill', ((v - 22) / 4 * 100).toFixed(1) + '%');
      if (reduced) { tauShown = v; dirty = true; }
      if (hover < 0 && cap) cap.innerHTML = captionFor(-1);
    }
    function captionFor(r) {
      if (r < 0) {
        var diff = tau - 24;
        if (Math.abs(diff) < 0.05) return 'τ = 24 h: in darkness the rhythm holds its phase';
        return 'τ = ' + tau.toFixed(1) + ' h: onsets drift ' + (diff < 0 ? 'earlier' : 'later') + ' by ' + Math.abs(diff * 60).toFixed(0) + ' min a day';
      }
      if (r < LD) return 'Day ' + (r + 1) + ' · <b>LD 12:12</b> · entrained, onset at ZT' + ONSET.toFixed(1);
      var dr = drift(r, tau);
      return 'Day ' + (r + 1) + ' · <b>DD</b> · free-running, ' + (dr >= 0 ? '+' : '−') + Math.abs(dr).toFixed(1) + ' h from LD';
    }

    if (slider) {
      slider.addEventListener('input', function () { setTau(parseFloat(slider.value)); });
      setTau(tau);
    }
    cv.addEventListener('pointermove', function (e) {
      if (!geo) return;
      var r = cv.getBoundingClientRect(), y = e.clientY - r.top;
      var row = Math.floor((y - G.T) / geo.rowH);
      var nh = row >= 0 && row < DAYS && row < Math.ceil(rows) ? row : -1;
      if (nh !== hover) { hover = nh; dirty = true; if (cap) cap.innerHTML = nh < 0 ? captionFor(-1) : captionFor(nh); }
    });
    cv.addEventListener('pointerleave', function () { hover = -1; dirty = true; if (cap) cap.innerHTML = captionFor(-1); });

    layout();
    watch(cv, layout);
    addEventListener('themechange', function () { readColors(); dirty = true; if (reduced) draw(); });
    if (cap && !slider) cap.innerHTML = capDefault;

    if (reduced) { draw(); if (document.fonts) document.fonts.ready.then(draw); return; }

    var visible = false;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { rootMargin: '10% 0px' }).observe(cv);
    else visible = true;
    AG.onFrame(function () {
      if (!visible) return;
      var r = cv.getBoundingClientRect(), vh = innerHeight;
      var p = clamp((vh * 0.92 - r.top) / (r.height + vh * 0.2), 0, 1);
      rowsTarget = Math.max(rowsTarget, Math.min(DAYS, p * DAYS * 1.2));
      var nr = lerp(rows, rowsTarget, 0.09);
      if (Math.abs(nr - rows) > 0.002) { rows = Math.abs(rowsTarget - nr) < 0.004 ? rowsTarget : nr; dirty = true; }
      if (Math.abs(tauShown - tau) > 0.0005) { tauShown = lerp(tauShown, tau, 0.14); dirty = true; }
      if (dirty) { dirty = false; draw(); }
    });
  })();

  /* ═══ FIG. 3 — HIDDEN MARKOV MODEL ═══════════════════════════════ */
  (function hypnogram() {
    var cv = document.querySelector('[data-hypnogram]');
    if (!cv || !cv.getContext) return;
    var svg = document.querySelector('[data-hmm-diagram]'), cap = document.querySelector('[data-hmm-cap]');
    var nodes = svg ? Array.prototype.slice.call(svg.querySelectorAll('[data-node]')) : [];
    var NAMES = ['active wake', 'quiet wake', 'light sleep', 'deep sleep'], ABBR = ['AW', 'QW', 'LS', 'DS'];
    var P = [
      [0.90, 0.10, 0, 0],
      [0.08, 0.84, 0.08, 0],
      [0, 0.07, 0.85, 0.08],
      [0, 0, 0.06, 0.94]
    ];
    var N = 90, STEP = 220, MAXC = 9;
    var states = [], counts = [], s = 0, bout = 0, acc = 0, geo = null;

    function next(from) {
      var r = Math.random(), a = 0;
      for (var j = 0; j < 4; j++) { a += P[from][j]; if (r < a) return j; }
      return from;
    }
    /* what a beam-break monitor actually sees: only active wake is loud;
       quiet wake flickers; the two sleep states are indistinguishable zeros */
    function emit(st) {
      if (st === 0) return 3 + Math.floor(Math.random() * 7);
      if (st === 1) return Math.random() < 0.3 ? 1 + Math.floor(Math.random() * 2) : 0;
      return 0;
    }
    function push(st) {
      states.push(st); counts.push(emit(st));
      if (states.length > N + 1) { states.shift(); counts.shift(); }
    }
    /* Pre-fill the trace. Deep sleep is sticky, so a random history can be
       one long flat line; redraw until it visits at least three states. */
    for (var tries = 0; tries < 40; tries++) {
      states = []; counts = []; s = Math.floor(Math.random() * 2); bout = 0;
      var seen = {}, flips = 0;
      for (var i = 0; i <= N; i++) {
        var ns0 = next(s);
        if (ns0 === s) bout++; else { bout = 0; flips++; }
        s = ns0; seen[s] = 1; push(s);
      }
      if (Object.keys(seen).length >= 3 && flips >= 6) break;
    }

    function layout() {
      var w = cv.clientWidth;
      geo = fit(cv, Math.round(clamp(w * 0.4, 150, 230)));
      draw(0);
    }
    function draw(frac) {
      if (!geo) return;
      var c = geo.ctx, w = geo.w, h = geo.h, L = 26, R = 10;
      var topH = Math.round(h * 0.26), yTop = topH + 22, yBot = h - 10;
      var stepW = (w - L - R) / (N - 1);
      var lv = function (k) { return yTop + k * (yBot - yTop) / 3; };
      var xi = function (j) { return L + (j - 1 - frac) * stepW; };
      c.clearRect(0, 0, w, h);
      c.font = mono; c.textBaseline = 'middle'; c.textAlign = 'left';

      /* observed counts */
      c.fillStyle = C['ink-3'];
      c.fillText('obs', 0, topH - 4);
      c.fillStyle = C.line; c.fillRect(L, topH, w - L - R, 1);
      c.save(); c.beginPath(); c.rect(L, 0, w - L - R, h); c.clip();
      for (var j = 0; j < counts.length; j++) {
        if (!counts[j]) continue;
        var bh = counts[j] / MAXC * (topH - 4);
        c.fillStyle = C.sun;
        c.globalAlpha = j === counts.length - 1 ? 1 : 0.35 + 0.55 * (j / counts.length);
        c.fillRect(xi(j) - stepW * 0.35, topH - bh, Math.max(1.5, stepW * 0.7), bh);
      }
      c.globalAlpha = 1;
      c.restore();

      /* level guides */
      for (var k = 0; k < 4; k++) {
        c.fillStyle = k === states[states.length - 1] ? C.dusk : C['ink-3'];
        c.fillText(ABBR[k], 0, lv(k));
        c.fillStyle = C.line; c.fillRect(L, Math.round(lv(k)), w - L - R, 1);
      }

      /* inferred hypnogram: violet depth below the waking line */
      c.save(); c.beginPath(); c.rect(L, 0, w - L - R, h); c.clip();
      c.beginPath();
      c.moveTo(xi(0), lv(states[0]));
      for (j = 1; j < states.length; j++) { c.lineTo(xi(j), lv(states[j - 1])); c.lineTo(xi(j), lv(states[j])); }
      var xe = xi(states.length - 1) + stepW * frac;
      c.lineTo(xe, lv(states[states.length - 1]));
      c.strokeStyle = C.dusk; c.lineWidth = 1.6; c.lineJoin = 'miter'; c.stroke();
      c.lineTo(xe, lv(0)); c.lineTo(xi(0), lv(0)); c.closePath();
      c.fillStyle = C.dusk; c.globalAlpha = 0.13; c.fill(); c.globalAlpha = 1;
      c.restore();

      /* now */
      var ye = lv(states[states.length - 1]);
      xe = Math.min(xe, w - R);
      c.fillStyle = C.dusk; c.globalAlpha = 0.22;
      c.beginPath(); c.arc(xe, ye, 7 + Math.sin(performance.now() / 260) * 1.5, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
      c.beginPath(); c.arc(xe, ye, 3.2, 0, Math.PI * 2); c.fill();
    }

    function setNode(st) {
      nodes.forEach(function (n, k) { n.classList.toggle('is-on', k === st); });
    }
    function caption() {
      if (cap) cap.innerHTML = 'State: <b>' + NAMES[s] + '</b> · bout ' + (bout + 1) + ' min · P(stay) ' + P[s][s].toFixed(2).slice(1);
    }
    function pulse(a, b) {
      if (!svg) return;
      var e = svg.querySelector('[data-edge="' + a + '-' + b + '"]');
      if (!e || !e.getTotalLength) return;
      e.classList.add('is-hot');
      setTimeout(function () { e.classList.remove('is-hot'); }, 520);
      var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '3.5'); dot.setAttribute('class', 'hmm__pulse');
      svg.appendChild(dot);
      var len = e.getTotalLength(), t0 = performance.now();
      (function mv(t) {
        var k = clamp((t - t0) / 420, 0, 1), ek = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var p = e.getPointAtLength(len * ek);
        dot.setAttribute('cx', p.x.toFixed(2)); dot.setAttribute('cy', p.y.toFixed(2));
        if (k < 1) requestAnimationFrame(mv); else dot.remove();
      })(t0);
    }
    function advance() {
      var ns = next(s);
      if (ns !== s) { pulse(s, ns); bout = 0; setTimeout(setNode.bind(null, ns), 360); }
      else bout++;
      s = ns;
      push(s);
      caption();
    }

    layout();
    watch(cv, layout);
    setNode(s); caption();
    addEventListener('themechange', function () { readColors(); draw(0); });
    if (reduced) { if (document.fonts) document.fonts.ready.then(function () { draw(0); }); return; }

    var visible = false;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
    else visible = true;
    AG.onFrame(function (t, dt) {
      if (!visible || document.hidden) return;
      acc += dt;
      while (acc >= STEP) { acc -= STEP; advance(); }
      draw(acc / STEP);
    });
  })();
})();
