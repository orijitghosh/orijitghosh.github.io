/* ═══════════════════════════════════════════════════════════════════
   research.js — Interactive chronobiology figures
   Fig. 1  Double-plotted Drosophila actogram across 7 days LD 12:12 and
           7 days constant darkness (DD), with Konopka & Benzer (1971)
           period mutant presets (WT, perS, perL, per0) and τ slider.
   Fig. 2  Four-state hidden Markov model of fly sleep (AW, QW, LS, DS),
           generating beam-break counts from a simulated hidden state sequence.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var AG = window.AG;
  if (!AG) return;
  var d = document.documentElement;
  var reduced = AG.reduced(), clamp = AG.clamp, lerp = AG.lerp;
  var mono = '400 9.5px "JetBrains Mono", ui-monospace, monospace';

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
      var lastW = 0, raf = 0;
      new ResizeObserver(function () {
        var w = el.clientWidth;
        if (w !== lastW) {
          lastW = w;
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(fn);
        }
      }).observe(el);
    } else addEventListener('resize', fn);
  }

  /* ═══ FIG. 1 — DOUBLE-PLOTTED ACTOGRAM ══════════════════════════ */
  (function actogram() {
    var cv = document.querySelector('[data-actogram]');
    if (!cv || !cv.getContext) return;
    var slider = document.querySelector('[data-tau]');
    var out = document.querySelector('[data-tau-out]');
    var cap = document.querySelector('[data-acto-cap]');
    var chips = AG.$$('[data-genotype]');

    var DAYS = 14, LD = 7, BINS = 48, ONSET = 9.0;
    var MIN_TAU = slider ? parseFloat(slider.min) : 18.5;
    var MAX_TAU = slider ? parseFloat(slider.max) : 29.5;
    var rnd = mulberry32(0x0c10c);
    var noise = [], spor = [];
    for (var dd = 0; dd <= DAYS + 1; dd++) {
      noise[dd] = []; spor[dd] = [];
      for (var b = 0; b < BINS; b++) {
        noise[dd][b] = rnd();
        spor[dd][b] = rnd() < 0.06 ? 0.18 + rnd() * 0.42 : 0;
      }
    }

    var tau = slider ? parseFloat(slider.value) : 23.8, tauShown = tau;
    var arrhythmic = false;
    var hover = -1, dirty = true, geo = null;
    var G = { L: 26, R: 30, T: 22, B: 22 };

    function phaseAt(day, hour, t) {
      if (day < LD) return hour;
      // Release at phase 0 at the start of DD; keep time across row boundaries.
      var elapsed = (day - LD) * 24 + hour;
      return ((elapsed * 24 / t) % 24 + 24) % 24;
    }
    function onsetAt(cycle, t) {
      // Absolute hour at the same internal phase used by the activity curve.
      return cycle < LD ? cycle * 24 + ONSET : LD * 24 + (cycle - LD + ONSET / 24) * t;
    }
    function value(day, bin, t) {
      var ld = day < LD, zt = bin / 2 + 0.25;
      if (arrhythmic) {
        /* per0 mutant: lacks endogenous clock anticipation; in LD shows acute
           light-driven masking + lights-on/off startle, in DD is aperiodic */
        var base = ld ? (zt < 12 ? 0.24 : 0.11) : 0.20;
        var v0 = base * (0.25 + 1.35 * noise[day][bin]) + spor[day][bin] * 0.85;
        if (ld && (bin === 0 || bin === 24)) v0 += 0.58;
        return clamp(v0, 0, 1.05);
      }
      var phase = phaseAt(day, zt, t);
      var a = AG.activity(phase);
      // Remove the LD background using internal phase, so DD has no 24h light cue.
      if (!ld) a = (a - (phase < 12 ? 0.07 : 0.025)) * 0.86 + 0.03;
      var v = a * (0.44 + 0.96 * noise[day][bin]) + spor[day][bin] * (a < 0.2 ? 0.8 : 0.25);
      if (ld && (bin === 0 || bin === 24)) v += 0.48;
      return clamp(v, 0, 1.08);
    }

    function layout() {
      var w = cv.clientWidth, rowH = Math.round(clamp(w * 0.036, 14, 21));
      geo = fit(cv, G.T + DAYS * rowH + G.B);
      geo.rowH = rowH; geo.pw = geo.w - G.L - G.R;
      dirty = true;
      draw();
    }

    function draw() {
      if (!geo) return;
      var c = geo.ctx, w = geo.w, h = geo.h, rowH = geo.rowH, pw = geo.pw, x0 = G.L, binW = pw / (BINS * 2);
      c.clearRect(0, 0, w, h);

      /* Light/Dark schedule bar at top */
      var q = pw / 4;
      c.fillStyle = C.sun; c.fillRect(x0, 5, q, 5); c.fillRect(x0 + 2 * q, 5, q, 5);
      c.fillStyle = C['ink-3']; c.fillRect(x0 + q, 5, q, 5); c.fillRect(x0 + 3 * q, 5, q, 5);

      for (var r = 0; r < DAYS; r++) {
        var y = G.T + r * rowH;
        c.font = mono; c.textBaseline = 'middle'; c.textAlign = 'right';
        c.fillStyle = r === hover ? C.sun : C['ink-3'];
        c.fillText(String(r + 1), x0 - 7, y + rowH / 2);

        c.save();
        c.beginPath(); c.rect(x0, y, pw, rowH); c.clip();
        if (r === hover) {
          c.fillStyle = C.sun; c.globalAlpha = 0.09; c.fillRect(x0, y, pw, rowH); c.globalAlpha = 1;
        }
        for (var half = 0; half < 2; half++) {
          var day = r + half, xs = x0 + half * pw / 2;
          c.fillStyle = C.shade;
          if (day < LD) c.fillRect(xs + pw / 4, y, pw / 4, rowH);
          else c.fillRect(xs, y, pw / 2, rowH);
          c.fillStyle = r === hover ? C.sun : C.ink;
          for (var bb = 0; bb < BINS; bb++) {
            var v = value(day, bb, tauShown);
            if (v < 0.025) continue;
            var bh = v * (rowH - 3);
            c.fillRect(xs + bb * binW, y + rowH - bh, Math.max(1, binW - 0.65), bh);
          }
        }
        c.fillStyle = C.line; c.fillRect(x0, y + rowH - 0.5, pw, 0.5);
        c.restore();
      }

      /* Constant-phase guides from the same continuous clock (omitted for per0). */
      if (!arrhythmic) {
        c.save();
        c.beginPath(); c.rect(x0, G.T, pw, DAYS * rowH); c.clip();
        c.strokeStyle = C.dusk; c.lineWidth = 1.3; c.setLineDash([3, 3]);
        var cycles = Math.ceil(DAYS * 24 / MIN_TAU) + 1;
        for (var k = -cycles; k <= cycles; k++) {
          c.beginPath();
          for (var rr = 0; rr < DAYS; rr++) {
            var hx = x0 + (onsetAt(rr + k, tauShown) - rr * 24) / 48 * pw;
            var hy = G.T + rr * rowH + rowH / 2;
            if (rr) c.lineTo(hx, hy); else c.moveTo(hx, hy);
          }
          c.stroke();
        }
        c.restore();
      }

      /* LD / DD regime brackets */
      c.setLineDash([]);
      c.strokeStyle = C['ink-3']; c.lineWidth = 1; c.fillStyle = C['ink-2']; c.font = mono;
      var bx = x0 + pw + 7;
      [[0, LD, 'LD'], [LD, DAYS, 'DD']].forEach(function (s) {
        var ya = G.T + s[0] * rowH + 2, yb = G.T + s[1] * rowH - 2;
        c.beginPath(); c.moveTo(bx, ya); c.lineTo(bx + 4, ya); c.lineTo(bx + 4, yb); c.lineTo(bx, yb); c.stroke();
        c.save(); c.translate(bx + 15, (ya + yb) / 2); c.rotate(Math.PI / 2); c.textAlign = 'center'; c.fillText(s[2], 0, 0); c.restore();
      });

      /* 48h double-plot axis */
      c.fillStyle = C['ink-3']; c.textBaseline = 'alphabetic';
      for (var t = 0; t <= 48; t += 12) {
        var tx = x0 + t / 48 * pw;
        c.fillRect(tx - 0.5, G.T + DAYS * rowH, 1, 4);
        c.textAlign = t === 0 ? 'left' : t === 48 ? 'right' : 'center';
        c.fillText(t === 0 ? '0 h' : String(t), tx, h - 4);
      }
    }

    function captionFor(r) {
      if (arrhythmic) {
        if (r >= 0 && r < LD) return 'Day ' + (r + 1) + ' · <b>LD 12:12</b> · acute masking to light, no clock anticipation';
        if (r >= LD) return 'Day ' + (r + 1) + ' · <b>DD</b> · arrhythmic (<i>per</i><sup>0</sup> lacks a working clock)';
        return '<i>per</i><sup>0</sup> mutant: masks to light in LD, then loses rhythmicity in DD';
      }
      if (r < 0) {
        var diff = tau - 24;
        if (Math.abs(diff) < 0.05) return 'τ = 24.0 h: internal period matches the 24 h day';
        return 'τ = ' + tau.toFixed(1) + ' h: internal cycles repeat every ' + tau.toFixed(1) + ' h in DD (' + (diff < 0 ? 'faster' : 'slower') + ' than a 24 h clock)';
      }
      if (r < LD) return 'Day ' + (r + 1) + ' · <b>LD 12:12</b> · entrained to light–dark cycle';
      return 'Day ' + (r + 1) + ' · <b>DD</b> · row starts ' + ((r - LD) * 24) + ' h after release · τ = ' + tau.toFixed(1) + ' h';
    }

    function syncChips(activeKey) {
      chips.forEach(function (ch) {
        ch.classList.toggle('is-active', ch.getAttribute('data-genotype') === activeKey);
      });
    }

    function setTau(v, genotypeKey) {
      arrhythmic = false;
      tau = v;
      if (slider) {
        slider.disabled = false;
        slider.value = String(v);
        slider.style.setProperty('--fill', ((v - MIN_TAU) / (MAX_TAU - MIN_TAU) * 100).toFixed(1) + '%');
      }
      if (out) out.innerHTML = v.toFixed(1) + '<small>h</small>';
      syncChips(genotypeKey || null);
      if (reduced) tauShown = v;
      dirty = true;
      if (hover < 0 && cap) cap.innerHTML = captionFor(-1);
      if (reduced) draw();
    }

    function setArrhythmic() {
      arrhythmic = true;
      if (out) out.innerHTML = '—<small>arr</small>';
      syncChips('per0');
      dirty = true;
      if (hover < 0 && cap) cap.innerHTML = captionFor(-1);
      draw();
    }

    chips.forEach(function (ch) {
      ch.addEventListener('click', function () {
        var val = ch.getAttribute('data-tau-val');
        var key = ch.getAttribute('data-genotype');
        if (val === 'arrhythmic') setArrhythmic();
        else setTau(parseFloat(val), key);
      });
    });

    if (slider) {
      slider.addEventListener('input', function () {
        var v = parseFloat(slider.value);
        var match = Math.abs(v - 23.8) < 0.05 ? 'wt' : Math.abs(v - 19.0) < 0.05 ? 'pers' : Math.abs(v - 29.0) < 0.05 ? 'perl' : null;
        setTau(v, match);
      });
      setTau(tau, 'wt');
    }

    cv.addEventListener('pointermove', function (e) {
      if (!geo) return;
      var r = cv.getBoundingClientRect(), y = e.clientY - r.top;
      var row = Math.floor((y - G.T) / geo.rowH);
      var nh = row >= 0 && row < DAYS ? row : -1;
      if (nh !== hover) { hover = nh; dirty = true; if (cap) cap.innerHTML = captionFor(nh); if (reduced) draw(); }
    });
    cv.addEventListener('pointerleave', function () {
      hover = -1; dirty = true;
      if (cap) cap.innerHTML = captionFor(-1);
      if (reduced) draw();
    });

    layout();
    watch(cv, layout);
    addEventListener('themechange', function () { readColors(); dirty = true; draw(); });
    if (document.fonts) document.fonts.ready.then(function () { dirty = true; draw(); });

    if (reduced) return;

    AG.onFrame(function () {
      if (!arrhythmic && Math.abs(tauShown - tau) > 0.002) {
        tauShown = lerp(tauShown, tau, 0.18);
        dirty = true;
      } else if (!arrhythmic && tauShown !== tau) {
        tauShown = tau;
        dirty = true;
      }
      if (dirty) { dirty = false; draw(); }
    });
  })();

  /* ═══ FIG. 2 — FOUR-STATE HIDDEN MARKOV MODEL ════════════════════ */
  (function hypnogram() {
    var cv = document.querySelector('[data-hypnogram]');
    if (!cv || !cv.getContext) return;
    var svg = document.querySelector('[data-hmm-diagram]');
    var cap = document.querySelector('[data-hmm-cap]');
    var toggleBtn = document.querySelector('[data-hmm-toggle]');
    var nodes = svg ? Array.prototype.slice.call(svg.querySelectorAll('[data-node]')) : [];

    var NAMES = ['active wake', 'quiet wake', 'light sleep', 'deep sleep'];
    var ABBR = ['AW', 'QW', 'LS', 'DS'];
    var P = [
      [0.88, 0.12, 0, 0],
      [0.09, 0.81, 0.10, 0],
      [0, 0.08, 0.83, 0.09],
      [0, 0, 0.07, 0.93]
    ];
    var N = 84, STEP = 720, MAXC = 9;
    var states = [], counts = [], s = 0, bout = 0, acc = 0, paused = false, geo = null;

    function next(from) {
      var r = Math.random(), a = 0;
      for (var j = 0; j < 4; j++) { a += P[from][j]; if (r < a) return j; }
      return from;
    }
    function emit(st) {
      if (st === 0) return 3 + Math.floor(Math.random() * 7);
      if (st === 1) return Math.random() < 0.32 ? 1 + Math.floor(Math.random() * 2) : 0;
      return 0;
    }
    function push(st) {
      states.push(st); counts.push(emit(st));
      if (states.length > N + 1) { states.shift(); counts.shift(); }
    }

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
      geo = fit(cv, Math.round(clamp(w * 0.38, 148, 210)));
      draw(0);
    }

    function draw(frac) {
      if (!geo) return;
      var c = geo.ctx, w = geo.w, h = geo.h, L = 28, R = 10;
      var topH = Math.round(h * 0.27), yTop = topH + 20, yBot = h - 10;
      var stepW = (w - L - R) / (N - 1);
      var lv = function (k) { return yTop + k * (yBot - yTop) / 3; };
      var xi = function (j) { return L + (j - 1 - frac) * stepW; };
      c.clearRect(0, 0, w, h);
      c.font = mono; c.textBaseline = 'middle'; c.textAlign = 'left';

      /* Simulated beam-break counts emitted by the hidden chain */
      c.fillStyle = C['ink-3'];
      c.fillText('sim', 0, topH - 5);
      c.fillStyle = C.line; c.fillRect(L, topH, w - L - R, 1);
      c.save(); c.beginPath(); c.rect(L, 0, w - L - R, h); c.clip();
      for (var j = 0; j < counts.length; j++) {
        if (!counts[j]) continue;
        var bh = counts[j] / MAXC * (topH - 4);
        c.fillStyle = C.sun;
        c.globalAlpha = j === counts.length - 1 ? 1 : 0.4 + 0.5 * (j / counts.length);
        c.fillRect(xi(j) - stepW * 0.35, topH - bh, Math.max(1.5, stepW * 0.7), bh);
      }
      c.globalAlpha = 1;
      c.restore();

      /* Hidden state levels */
      for (var k = 0; k < 4; k++) {
        c.fillStyle = k === states[states.length - 1] ? C.dusk : C['ink-3'];
        c.fillText(ABBR[k], 0, lv(k));
        c.fillStyle = C.line; c.fillRect(L, Math.round(lv(k)), w - L - R, 1);
      }

      /* Generating state sequence, not a decoded/inferred hypnogram */
      c.save(); c.beginPath(); c.rect(L, 0, w - L - R, h); c.clip();
      c.beginPath();
      c.moveTo(xi(0), lv(states[0]));
      for (j = 1; j < states.length; j++) { c.lineTo(xi(j), lv(states[j - 1])); c.lineTo(xi(j), lv(states[j])); }
      var xe = xi(states.length - 1) + stepW * frac;
      c.lineTo(xe, lv(states[states.length - 1]));
      c.strokeStyle = C.dusk; c.lineWidth = 1.6; c.lineJoin = 'miter'; c.stroke();
      c.lineTo(xe, lv(0)); c.lineTo(xi(0), lv(0)); c.closePath();
      c.fillStyle = C.dusk; c.globalAlpha = 0.12; c.fill(); c.globalAlpha = 1;
      c.restore();

      var ye = lv(states[states.length - 1]);
      xe = Math.min(xe, w - R);
      c.fillStyle = C.dusk;
      c.beginPath(); c.arc(xe, ye, 3.2, 0, Math.PI * 2); c.fill();
    }

    function setNode(st) {
      nodes.forEach(function (n, k) { n.classList.toggle('is-on', k === st); });
    }
    function caption() {
      if (cap) cap.innerHTML = 'Simulated state: <b>' + NAMES[s] + '</b> · bout ' + (bout + 1) + ' min · P(stay) = ' + P[s][s].toFixed(2);
    }
    function highlightEdge(a, b) {
      if (!svg) return;
      var e = svg.querySelector('[data-edge="' + a + '-' + b + '"]');
      if (!e) return;
      e.classList.add('is-hot');
      setTimeout(function () { e.classList.remove('is-hot'); }, 450);
    }
    function advance() {
      var ns = next(s);
      if (ns !== s) { highlightEdge(s, ns); bout = 0; setNode(ns); }
      else bout++;
      s = ns;
      push(s);
      caption();
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        paused = !paused;
        toggleBtn.setAttribute('aria-pressed', String(paused));
        toggleBtn.textContent = paused ? 'Resume' : 'Pause';
      });
    }

    layout();
    watch(cv, layout);
    setNode(s); caption();
    addEventListener('themechange', function () { readColors(); draw(0); });
    if (reduced) {
      if (toggleBtn) toggleBtn.hidden = true;
      if (document.fonts) document.fonts.ready.then(function () { draw(0); });
      return;
    }

    var visible = false;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
    else visible = true;

    AG.onFrame(function (_t, dt) {
      if (!visible || document.hidden || paused) return;
      acc += dt;
      while (acc >= STEP) { acc -= STEP; advance(); }
      draw(acc / STEP);
    });
  })();
})();
