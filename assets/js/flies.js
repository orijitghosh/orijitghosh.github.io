/* ═══════════════════════════════════════════════════════════════════
   flies.js — a live Drosophila arena behind the hero
   Each fly runs a small behavioural state machine (walk · rest · flight
   · sleep). How many are awake follows the real LD activity profile at
   the visitor's current Zeitgeber time. The pointer is a stimulus:
   hovering wakes sleepers, fast sweeps and clicks startle them into
   flight, and a tracking reticle labels the nearest fly the way
   video-tracking software would. Also drives the ZT dial and the glow.
   On the 404 page (data-mode="arrhythmic") the clock is simply broken.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var AG = window.AG;
  if (!AG) return;
  var d = document.documentElement;
  var reduced = AG.reduced();
  var clamp = AG.clamp, lerp = AG.lerp, TAU = Math.PI * 2;
  var rand = Math.random;
  function randn() { return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(TAU * rand()); }
  function angDiff(a, b) { var x = (a - b) % TAU; if (x > Math.PI) x -= TAU; if (x < -Math.PI) x += TAU; return x; }

  /* ═══ ZT DIAL ════════════════════════════════════════════════════ */
  (function dial() {
    var zt = document.querySelector('[data-zt]');
    if (!zt) return;
    var ticks = zt.querySelector('[data-zt-ticks]'), curve = zt.querySelector('[data-zt-curve]'), hand = zt.querySelector('[data-zt-hand]');
    var tEl = zt.querySelector('[data-zt-time]'), pEl = zt.querySelector('[data-zt-phase]'), mEl = zt.querySelector('[data-zt-msg]');
    var html = '';
    for (var i = 0; i < 48; i++) {
      var a = i / 48 * TAU, major = i % 12 === 0, mid = i % 2 === 0;
      var r1 = major ? 75 : mid ? 80 : 83;
      html += '<line' + (major ? ' class="major"' : '') + ' x1="' + (100 + Math.sin(a) * 86).toFixed(2) + '" y1="' + (100 - Math.cos(a) * 86).toFixed(2) +
        '" x2="' + (100 + Math.sin(a) * r1).toFixed(2) + '" y2="' + (100 - Math.cos(a) * r1).toFixed(2) + '"/>';
    }
    ticks.innerHTML = html;
    function path(k) {
      var s = '';
      for (var j = 0; j <= 192; j++) {
        var z = j / 192 * 24, a = z / 24 * TAU, r = 30 + AG.activity(z) * 46 * k;
        s += (j ? 'L' : 'M') + (100 + Math.sin(a) * r).toFixed(2) + ' ' + (100 - Math.cos(a) * r).toFixed(2);
      }
      return s + 'Z';
    }
    curve.setAttribute('d', path(reduced ? 1 : 0));
    var ang = 0, started = false;
    function update() {
      var n = AG.now();
      tEl.innerHTML = n.hhmm + ' local · <b>ZT' + AG.pad(Math.floor(n.zt)) + '</b>';
      var ph = AG.phase(n.zt);
      pEl.textContent = ph.name;
      mEl.textContent = ph.msg;
      zt.setAttribute('data-phase', ph.key);
      if (!started) return;
      var target = n.zt * 15, delta = ((target - ang) % 360 + 360) % 360;
      ang += delta;
      hand.style.transform = 'rotate(' + ang.toFixed(2) + 'deg)';
    }
    update();
    setInterval(update, 20000);
    if (reduced) { started = true; hand.style.transition = 'none'; update(); return; }
    var poll = setInterval(function () {
      if (!zt.classList.contains('is-in')) return;
      clearInterval(poll);
      setTimeout(function () {
        started = true; update();
        var t0 = performance.now();
        (function grow(t) {
          var k = clamp((t - t0) / 2200, 0, 1), e = 1 - Math.pow(1 - k, 4);
          curve.setAttribute('d', path(e));
          if (k < 1) requestAnimationFrame(grow);
        })(t0);
      }, 250);
    }, 120);
  })();

  /* ═══ ARENA ══════════════════════════════════════════════════════ */
  var canvas = document.querySelector('[data-flies]');
  if (!canvas || !canvas.getContext) return;
  var host = canvas.parentElement;
  var ctx = canvas.getContext('2d');
  var arrhythmic = canvas.getAttribute('data-mode') === 'arrhythmic';
  var glow = host.querySelector('[data-glow]');
  var loader = document.querySelector('[data-loader]');
  var W = 0, H = 0, DPR = 1, S = 1, rect = null;
  var flies = [], ripples = [], zs = [];
  var col = {};
  var visible = true, fade = 0, pAwake = 0.5;
  var pt = { x: -1e4, y: -1e4, vx: 0, vy: 0, speed: 0, inside: false, lx: 0, ly: 0 };
  var reticle = { x: 0, y: 0, a: 0, f: null, sz: 0 };

  function readColors() {
    var cs = getComputedStyle(d);
    col.fly = cs.getPropertyValue('--fly').trim() || 'rgba(237,231,219,.8)';
    col.sun = cs.getPropertyValue('--sun').trim() || '#f5b83d';
    col.ink2 = cs.getPropertyValue('--ink-2').trim() || '#aaa';
    col.dark = d.getAttribute('data-theme') !== 'light';
    col.eye = col.dark ? '#ff6b4f' : '#b3371d';
    col.eyeW = col.dark ? '#f3ede2' : '#fbf8f1';
  }

  function updateAwake() {
    pAwake = 0.1 + 0.9 * AG.activity(AG.now().zt);
  }

  function makeFly(i) {
    var f = {
      id: i + 1,
      x: rand() * W, y: rand() * H, a: rand() * TAU, w: 0, v: 0, vt: 0,
      state: 'rest', t: rand() * 2, wing: rand() * TAU, thr: rand(),
      white: rand() < 0.16, trail: [], tt: 0, wakeUntil: 0, sleepAt: 0,
      depth: 0.5, arousal: 0, zT: 2 + rand() * 4, coin: rand() < 0.5, gait: rand() * TAU,
      size: 0.9 + rand() * 0.22
    };
    if (!wantsAwake(f, 0)) enterSleep(f, 0, true);
    return f;
  }

  function wantsAwake(f, now) {
    if (now < f.wakeUntil) return true;
    if (arrhythmic) return f.coin;
    return f.thr < pAwake;
  }
  function enterSleep(f, now, instant) {
    f.state = 'sleep'; f.v = 0; f.t = 1 + rand() * 2;
    f.sleepAt = instant ? now - 60000 * rand() : now;
    f.depth = 0.35 + rand() * 0.65; f.arousal = 0;
    f.zT = 1.5 + rand() * 3;
  }
  function startWalk(f) { f.state = 'walk'; f.t = 1 + rand() * 4.5; f.vt = (15 + rand() * 30) * S; }
  function startFlight(f, heading) {
    f.state = 'fly'; f.t = 0.35 + rand() * 0.8;
    if (heading != null) f.a = heading + randn() * 0.35;
    f.v = (230 + rand() * 140) * S; f.w = randn() * 1.6;
  }
  function wake(f, now, hold) {
    f.wakeUntil = Math.max(f.wakeUntil, now + hold);
    if (f.state === 'sleep') startWalk(f);
  }

  function resize() {
    var r = host.getBoundingClientRect();
    var nw = Math.max(1, r.width), nh = Math.max(1, r.height);
    if (W && H) flies.forEach(function (f) { f.x *= nw / W; f.y *= nh / H; f.trail.length = 0; });
    W = nw; H = nh;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    S = clamp(W / 1150, 0.82, 1.3);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    var want = Math.round(clamp(W * H / 23000, 12, arrhythmic ? 46 : 58));
    while (flies.length < want) flies.push(makeFly(flies.length));
    if (flies.length > want) flies.length = want;
    if (reduced) draw(performance.now());
  }

  /* stimuli */
  function startle(x, y, radius, now) {
    ripples.push({ x: x, y: y, t: now, r: radius });
    flies.forEach(function (f) {
      var dx = f.x - x, dy = f.y - y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) return;
      wake(f, now, 6000 + rand() * 6000);
      if (rand() < 1.1 - dist / radius) startFlight(f, Math.atan2(dy, dx));
      else { f.a = Math.atan2(dy, dx); f.state = 'walk'; f.t = 1 + rand() * 2; f.vt = 55 * S; }
    });
  }
  AG.startle = function (fraction) {
    var now = performance.now();
    flies.forEach(function (f) {
      wake(f, now, 2500 + rand() * 3000);
      if (rand() < (fraction || 0.3)) startFlight(f, rand() * TAU);
    });
  };

  /* ── update ────────────────────────────────────────────────────── */
  function step(f, dt, now) {
    var sec = dt / 1000, awakeWanted = wantsAwake(f, now);
    f.t -= sec;
    f.wing += sec * (f.state === 'fly' ? 90 : 3);

    /* pointer as stimulus */
    if (pt.inside) {
      var dx = f.x - pt.x, dy = f.y - pt.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (f.state === 'sleep' && dist < 120 * S) {
        f.arousal += sec * (0.35 + pt.speed / 900) * (1 - dist / (120 * S)) * 2.2;
        if (f.arousal > f.depth) { wake(f, now, 7000 + rand() * 6000); f.a = Math.atan2(dy, dx) + randn() * 0.6; }
      } else if (f.state !== 'sleep' && f.state !== 'fly') {
        if (dist < 80 * S && pt.speed > 650) startFlight(f, Math.atan2(dy, dx));
        else if (dist < 110 * S) {
          if (f.state === 'rest') startWalk(f);
          f.a += angDiff(Math.atan2(dy, dx), f.a) * Math.min(1, sec * 4);
          f.vt = Math.max(f.vt, 40 * S);
        }
      }
    }

    switch (f.state) {
      case 'sleep':
        f.arousal = Math.max(0, f.arousal - sec * 0.08);
        if (f.t <= 0) { f.t = 0.8 + rand() * 1.6; if (awakeWanted) startWalk(f); }
        if (arrhythmic && rand() < sec * 0.05) f.coin = !f.coin;
        f.zT -= sec;
        if (f.zT <= 0 && now - f.sleepAt > 1500) { f.zT = 3.5 + rand() * 4; if (zs.length < 40) zs.push({ x: f.x + 5 * S, y: f.y - 6 * S, t: now }); }
        break;
      case 'rest':
        if (f.t <= 0) {
          if (!awakeWanted) enterSleep(f, now);
          else if (rand() < 0.8) startWalk(f); else f.t = 0.6 + rand() * 2;
        }
        break;
      case 'walk':
        f.w += (-f.w * 2.2 + randn() * 7) * sec;
        f.a += f.w * sec;
        f.v = lerp(f.v, f.vt, Math.min(1, sec * 3));
        f.gait += sec * 22;
        if (f.t <= 0) {
          var r = rand();
          if (!awakeWanted && r < 0.7) { f.state = 'rest'; f.t = 0.5 + rand(); }
          else if (r < 0.05 + 0.05 * pAwake) startFlight(f, f.a);
          else if (r < 0.42) { f.state = 'rest'; f.t = 0.5 + rand() * 3.5; }
          else startWalk(f);
          if (arrhythmic && rand() < 0.3) f.coin = !f.coin;
        }
        break;
      case 'fly':
        f.w += randn() * 6 * sec;
        f.a += f.w * sec;
        if (f.t <= 0) { f.state = 'walk'; f.t = 0.8 + rand() * 2; f.vt = 22 * S; }
        break;
    }
    if (f.state === 'rest' || f.state === 'sleep') f.v = lerp(f.v, 0, Math.min(1, sec * 8));

    /* keep inside the arena */
    var m = (f.state === 'fly' ? 60 : 24) * S;
    if (f.x < m || f.x > W - m || f.y < m || f.y > H - m) {
      f.a += angDiff(Math.atan2(H / 2 - f.y + randn() * H * 0.2, W / 2 - f.x + randn() * W * 0.2), f.a) * Math.min(1, sec * (f.state === 'fly' ? 6 : 2.5));
    }
    f.x = clamp(f.x + Math.cos(f.a) * f.v * sec, 2, W - 2);
    f.y = clamp(f.y + Math.sin(f.a) * f.v * sec, 2, H - 2);

    /* tracking trail */
    f.tt -= dt;
    if (f.tt <= 0) {
      f.tt = 55;
      if (f.v > 2) { f.trail.push(f.x, f.y); if (f.trail.length > 64) f.trail.splice(0, 2); }
      else if (f.trail.length) f.trail.splice(0, 2);
    }
  }

  /* ── draw ──────────────────────────────────────────────────────── */
  function wingEllipse(px, ang, len, wid) {
    ctx.beginPath();
    ctx.ellipse(px + Math.cos(ang) * len, Math.sin(ang) * len, len, wid, ang, 0, TAU);
    ctx.fill();
  }
  function drawFly(f, now) {
    var s = 1.3 * S * f.size, flying = f.state === 'fly', asleep = f.state === 'sleep';
    ctx.save();
    ctx.translate(f.x, f.y);
    var wob = f.state === 'walk' ? Math.sin(f.gait) * 0.06 : 0;
    ctx.rotate(f.a + wob);
    if (asleep) { var b = 1 + Math.sin(now * 0.0022 + f.id) * 0.03; ctx.scale(b, b); }
    ctx.fillStyle = col.fly;
    var base = asleep ? 0.5 : 1;
    /* wings */
    var spread = flying ? 1.05 + Math.sin(f.wing) * 0.55 : 0.2 + (f.state === 'rest' ? 0.02 * Math.sin(f.wing * 2) : 0);
    ctx.globalAlpha = fade * base * (flying ? 0.2 : 0.34);
    var wl = (flying ? 3.4 : 2.9) * s, ww = (flying ? 1.5 : 1.15) * s;
    wingEllipse(0.4 * s, Math.PI - spread, wl, ww);
    wingEllipse(0.4 * s, Math.PI + spread, wl, ww);
    /* body: abdomen, thorax, head */
    ctx.globalAlpha = fade * base * 0.95;
    ctx.beginPath(); ctx.ellipse(-1.5 * s, 0, 2.2 * s, 1.25 * s, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0.8 * s, 0, 1.15 * s, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(2.3 * s, 0, 0.85 * s, 0, TAU); ctx.fill();
    /* eyes: Canton-S red, or w1118 white */
    ctx.globalAlpha = fade * (asleep ? 0.45 : 0.95);
    ctx.fillStyle = f.white ? col.eyeW : col.eye;
    ctx.beginPath(); ctx.arc(2.45 * s, -0.62 * s, 0.5 * s, 0, TAU); ctx.arc(2.45 * s, 0.62 * s, 0.5 * s, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function draw(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!fade) return;

    /* trails */
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 1;
    ctx.strokeStyle = col.sun;
    for (var i = 0; i < flies.length; i++) {
      var tr = flies[i].trail, n = tr.length / 2;
      if (n < 2) continue;
      var chunks = 4, per = Math.ceil(n / chunks);
      for (var c = 0; c < chunks; c++) {
        var a0 = c * per, a1 = Math.min(n - 1, (c + 1) * per);
        if (a1 <= a0) continue;
        ctx.globalAlpha = fade * 0.32 * ((c + 1) / chunks) * (flies[i].state === 'fly' ? 0.6 : 1);
        ctx.beginPath(); ctx.moveTo(tr[a0 * 2], tr[a0 * 2 + 1]);
        for (var k = a0 + 1; k <= a1; k++) ctx.lineTo(tr[k * 2], tr[k * 2 + 1]);
        if (c === chunks - 1) ctx.lineTo(flies[i].x, flies[i].y);
        ctx.stroke();
      }
    }

    /* startle ripples */
    for (var r = ripples.length - 1; r >= 0; r--) {
      var rp = ripples[r], k2 = (now - rp.t) / 1100;
      if (k2 >= 1) { ripples.splice(r, 1); continue; }
      var e = 1 - Math.pow(1 - k2, 3);
      ctx.globalAlpha = (1 - k2) * 0.7; ctx.strokeStyle = col.sun; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r * e, 0, TAU); ctx.stroke();
      ctx.globalAlpha = (1 - k2) * 0.35;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r * 0.55 * e, 0, TAU); ctx.stroke();
    }

    for (var j = 0; j < flies.length; j++) drawFly(flies[j], now);

    /* sleep z's */
    ctx.font = 'italic 400 ' + Math.round(11 * S) + 'px Fraunces, Georgia, serif';
    ctx.fillStyle = col.ink2;
    for (var z = zs.length - 1; z >= 0; z--) {
      var zz = zs[z], kz = (now - zz.t) / 2600;
      if (kz >= 1) { zs.splice(z, 1); continue; }
      ctx.globalAlpha = fade * Math.sin(kz * Math.PI) * 0.8;
      ctx.fillText('z', zz.x + Math.sin(kz * 5) * 2.5 * S, zz.y - kz * 18 * S);
    }

    /* tracking reticle */
    if (reticle.a > 0.01 && reticle.f) {
      var f = reticle.f, bx = reticle.x, by = reticle.y, h = reticle.sz / 2, L = 5 * S;
      ctx.globalAlpha = reticle.a * fade;
      ctx.strokeStyle = col.sun; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx - h, by - h + L); ctx.lineTo(bx - h, by - h); ctx.lineTo(bx - h + L, by - h);
      ctx.moveTo(bx + h - L, by - h); ctx.lineTo(bx + h, by - h); ctx.lineTo(bx + h, by - h + L);
      ctx.moveTo(bx + h, by + h - L); ctx.lineTo(bx + h, by + h); ctx.lineTo(bx + h - L, by + h);
      ctx.moveTo(bx - h + L, by + h); ctx.lineTo(bx - h, by + h); ctx.lineTo(bx - h, by + h - L);
      ctx.moveTo(bx + h, by - h); ctx.lineTo(bx + h + 10 * S, by - h - 10 * S); ctx.lineTo(bx + h + 18 * S, by - h - 10 * S);
      ctx.stroke();
      var mmps = f.v * (2.5 / (7.5 * S)); /* ~2.5 mm body length */
      var label = f.state === 'sleep' ? 'asleep · ' + fmtDur(now - f.sleepAt)
        : f.state === 'fly' ? 'in flight'
        : f.state === 'walk' ? 'walking ' + mmps.toFixed(1) + ' mm/s' : 'resting';
      ctx.font = '500 ' + Math.round(10 * Math.max(1, S)) + 'px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = col.sun;
      ctx.fillText((f.white ? 'w¹¹¹⁸' : 'CS') + ' #' + AG.pad(f.id), bx + h + 22 * S, by - h - 13 * S);
      ctx.fillStyle = col.ink2;
      ctx.fillText(label, bx + h + 22 * S, by - h + 1 * S);
    }
    ctx.globalAlpha = 1;
  }
  function fmtDur(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(s / 60) + ':' + AG.pad(s % 60);
  }

  /* ── loop ──────────────────────────────────────────────────────── */
  var lastSample = 0, lastAwake = 0, fadeStart = 0;
  function tick(now, dt) {
    if (!visible || document.hidden || reduced) return;
    if (!fadeStart) {
      var introing = d.classList.contains('intro') && loader && !loader.classList.contains('is-out');
      if (!d.classList.contains('ready') || introing) return;
      fadeStart = now;
      if (loader && d.classList.contains('intro')) setTimeout(function () { AG.startle(0.35); }, 250);
    }
    fade = clamp((now - fadeStart) / 1400, 0, 1);
    if (now - lastAwake > 5000) { lastAwake = now; updateAwake(); }

    /* pointer in arena coordinates */
    rect = host.getBoundingClientRect();
    var p = AG.pointer;
    var nx = p.x - rect.left, ny = p.y - rect.top;
    pt.inside = p.active && nx >= 0 && ny >= 0 && nx <= rect.width && ny <= rect.height;
    if (now - lastSample > 32) {
      var el = (now - lastSample) / 1000; lastSample = now;
      var sp = Math.sqrt((nx - pt.lx) * (nx - pt.lx) + (ny - pt.ly) * (ny - pt.ly)) / Math.max(el, 0.016);
      pt.speed = lerp(pt.speed, Math.min(sp, 4000), 0.5);
      pt.lx = nx; pt.ly = ny;
    }
    pt.x = nx; pt.y = ny;

    for (var i = 0; i < flies.length; i++) step(flies[i], dt, now);

    /* reticle target: nearest fly to the pointer */
    var best = null, bd = 170 * S;
    if (pt.inside) for (var j = 0; j < flies.length; j++) {
      var f = flies[j], dx = f.x - pt.x, dy = f.y - pt.y, dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < bd) { bd = dd; best = f; }
    }
    if (best) {
      if (reticle.f !== best) { if (reticle.a < 0.05) { reticle.x = best.x; reticle.y = best.y; reticle.sz = 60 * S; } reticle.f = best; }
      reticle.x = lerp(reticle.x, best.x, 0.3); reticle.y = lerp(reticle.y, best.y, 0.3);
      reticle.sz = lerp(reticle.sz, 22 * S, 0.14);
      reticle.a = lerp(reticle.a, 1, 0.14);
    } else reticle.a = lerp(reticle.a, 0, 0.14);

    /* glow: the sun (or the moon) crosses the hero; the pointer tugs it */
    if (glow) {
      var n = AG.now(), hr = n.h + n.m / 60, day = hr >= 6 && hr < 18;
      var kk = day ? (hr - 6) / 12 : ((hr - 18 + 24) % 24) / 12;
      var gx = W * (0.1 + 0.8 * kk), gy = H * (0.66 - 0.46 * Math.sin(Math.PI * kk));
      if (pt.inside) { gx = lerp(gx, pt.x, 0.3); gy = lerp(gy, pt.y, 0.3); }
      glow._x = lerp(glow._x == null ? gx : glow._x, gx, 0.04);
      glow._y = lerp(glow._y == null ? gy : glow._y, gy, 0.04);
      glow.style.setProperty('--gx', glow._x.toFixed(1) + 'px');
      glow.style.setProperty('--gy', glow._y.toFixed(1) + 'px');
    }

    draw(now);
  }

  readColors();
  updateAwake();
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(function () { resize(); }).observe(host);
  else addEventListener('resize', resize);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(host);

  addEventListener('themechange', function () {
    readColors();
    if (reduced) { draw(performance.now()); return; }
    /* a light transition is a Zeitgeber: the flies startle, just as they do at lights-on */
    setTimeout(function () { AG.startle(0.4); }, 200);
  });

  if (reduced) {
    fade = 1;
    flies.forEach(function (f) { f.a = rand() * TAU; });
    if (document.fonts) document.fonts.ready.then(function () { draw(performance.now()); });
    draw(performance.now());
    return;
  }

  host.addEventListener('pointerdown', function (e) {
    if (e.target.closest('a,button,input,label,select,textarea')) return;
    var r = host.getBoundingClientRect();
    startle(e.clientX - r.left, e.clientY - r.top, 240 * S, performance.now());
  });
  AG.onFrame(tick);
})();
