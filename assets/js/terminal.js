/* ═══════════════════════════════════════════════════════════════════
   terminal.js — press ` (or the footer key) for a tiny shell.
   The old site was a terminal; this keeps it around as a habit.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var AG = window.AG;
  if (!AG) return;
  var D = AG.data || {}, root = D.root || '';
  var pages = (D.pages || []).map(function (p) { return { key: p[0], href: p[1], label: p[2], slug: p[2].toLowerCase() }; });
  var term, out, input, opener = null, hist = [], hi = 0, built = false;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function strip(html) { var t = document.createElement('div'); t.innerHTML = html; return t.textContent; }
  function sun(s) { return '<span class="t-sun">' + s + '</span>'; }
  function dim(s) { return '<span class="t-dim">' + s + '</span>'; }
  function link(href, label) { return '<a class="link" href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + '</a>'; }

  function findPage(arg) {
    arg = (arg || '').toLowerCase().replace(/^[~.\/]+|\/$/g, '').replace(/\.html$/, '');
    if (!arg || arg === 'home' || arg === 'about') arg = 'index';
    if (arg === 'code' || arg === 'repos') arg = 'repositories';
    if (arg === 'pubs' || arg === 'papers') arg = 'publications';
    return pages.filter(function (p) { return p.key === arg || p.slug === arg; })[0];
  }
  function go(p) {
    try { sessionStorage.setItem('ag-vt', JSON.stringify({ x: innerWidth - 60, y: innerHeight - 60, t: Date.now() })); } catch (e) {}
    setTimeout(function () { location.href = root + p.href; }, 380);
    return [dim('cd ~/' + (p.key === 'index' ? '' : p.key + '/') + ' …')];
  }

  var C = {
    help: function () {
      return [
        sun('navigation'),
        '  ls                  list pages',
        '  cd &lt;page&gt;           go to a page (also: open &lt;page&gt;)',
        '  scholar · github    open profiles',
        sun('about'),
        '  whoami · cat bio    who is this',
        '  contact · email     how to reach me (email copies it)',
        '  zt · date           your time, as a fly would read it',
        sun('toys'),
        '  theme [light|dark|auto]',
        '  startle             tap the glass',
        '  clear · history · exit'
      ];
    },
    ls: function () {
      return [pages.map(function (p) { return sun(p.key === 'index' ? 'about/' : p.key + '/'); }).join('   ') + '   ' + dim('cv.pdf')];
    },
    cd: function (a) {
      if (a === 'cv.pdf') { window.open(D.cv, '_blank', 'noopener'); return [dim('opening cv.pdf …')]; }
      var p = findPage(a);
      if (!p) return ['<span class="t-err">cd: no such page: ' + esc(a) + '</span>'];
      return go(p);
    },
    whoami: function () { return [esc(D.name) + ' ' + dim('(' + esc(D.native) + ')'), esc(D.designation) + ', ' + esc(D.affiliation), dim(esc(D.location))]; },
    'cat': function (a) {
      if (a === 'bio' || a === 'bio.txt') return (D.bio || []).map(function (p) { return esc(strip(p)); }).join('\n\n').split('\n');
      if (a === 'tags' || a === 'interests') return [(D.tags || []).map(esc).join(dim(' · '))];
      return ['<span class="t-err">cat: ' + esc(a || '') + ': no such file</span>', dim('try: cat bio · cat tags')];
    },
    pwd: function () { return [esc(location.pathname || '/')]; },
    date: function () { return [esc(new Date().toString())]; },
    zt: function () {
      var n = AG.now(), ph = AG.phase(n.zt);
      var bar = '', a = AG.activity(n.zt);
      for (var i = 0; i < 24; i++) bar += i === Math.floor(n.zt) ? '●' : AG.activity(i + 0.5) > 0.35 ? '▮' : '·';
      return [
        'local ' + sun(n.hhmm) + '  →  ZT ' + sun(n.zt.toFixed(2)),
        dim('ZT0 ') + bar + dim(' ZT24'),
        ph.name + dim(' · expected activity ' + Math.round(a * 100) + '%')
      ];
    },
    contact: function () {
      return ['email   ' + '<a class="link" href="mailto:' + esc(D.email) + '">' + esc(D.email) + '</a>', 'github  ' + link(D.github, D.github.replace(/^https?:\/\//, '')), 'scholar ' + link(D.scholar, 'Google Scholar')];
    },
    email: function () {
      if (navigator.clipboard) navigator.clipboard.writeText(D.email).catch(function () {});
      return [esc(D.email) + dim('  (copied)')];
    },
    scholar: function () { window.open(D.scholar, '_blank', 'noopener'); return [dim('opening Google Scholar …')]; },
    github: function () { window.open(D.github, '_blank', 'noopener'); return [dim('opening GitHub …')]; },
    theme: function (a) {
      var t = a === 'light' || a === 'dark' || a === 'auto' ? a : (document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
      var r = term.getBoundingClientRect();
      AG.setTheme(t, { x: r.left + 24, y: r.top + 18 });
      return [t === 'auto' ? 'theme follows the sun again' : 'lights ' + (t === 'light' ? 'on' : 'off')];
    },
    startle: function () {
      if (!AG.startle) return [dim('the flies live on the home page. ') + 'cd about'];
      AG.startle(0.8);
      return ['*tap tap*  ' + dim('the flies scatter')];
    },
    history: function () { return hist.length ? hist.map(function (h, i) { return dim(String(i + 1).padStart(3, ' ') + '  ') + esc(h); }) : [dim('(empty)')]; },
    sudo: function () { return ['<span class="t-err">' + esc(D.name.split(' ')[0].toLowerCase()) + ' is not in the sudoers file. This incident will be reported to the PI.</span>']; },
    echo: function (a, raw) { return [esc(raw)]; },
    exit: function () { close(); return []; },
    clear: function () { out.innerHTML = ''; return []; }
  };
  C.open = C.cd; C.man = C.help; C['?'] = C.help; C.time = C.zt; C.lights = C.theme;

  function print(lines) {
    lines.forEach(function (l) { var div = document.createElement('div'); div.innerHTML = l || '&nbsp;'; out.appendChild(div); });
    out.scrollTop = out.scrollHeight;
  }
  function run(raw) {
    var line = raw.trim();
    print([sun('$') + ' ' + esc(line)]);
    if (!line) return;
    hist.push(line); hi = hist.length;
    var parts = line.split(/\s+/), cmd = parts[0].toLowerCase(), arg = (parts[1] || '').toLowerCase();
    var rest = line.slice(parts[0].length).trim();
    var fn = Object.prototype.hasOwnProperty.call(C, cmd) ? C[cmd] : null;
    if (!fn) {
      var p = findPage(cmd);
      if (p && p.key !== 'index') { print(go(p)); return; }
      print(['<span class="t-err">' + esc(cmd) + ': command not found</span>' + dim('  · try help')]);
      return;
    }
    print(fn(arg, rest));
  }

  function complete() {
    var v = input.value, parts = v.split(/\s+/);
    var pool = parts.length > 1 ? pages.map(function (p) { return p.key === 'index' ? 'about' : p.key; }).concat(['bio', 'tags', 'light', 'dark', 'auto']) : Object.keys(C);
    var last = parts[parts.length - 1].toLowerCase();
    var hits = pool.filter(function (c) { return c.indexOf(last) === 0; });
    if (hits.length === 1) { parts[parts.length - 1] = hits[0]; input.value = parts.join(' ') + ' '; }
    else if (hits.length > 1) print([dim(hits.join('   '))]);
  }

  function build() {
    if (built) return;
    built = true;
    term = document.createElement('section');
    term.className = 'term';
    term.setAttribute('role', 'dialog');
    term.setAttribute('aria-label', 'Terminal');
    term.innerHTML =
      '<div class="term__head"><span class="term__dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
      '<span>visitor@zeitgeber: ~</span>' +
      '<button class="term__close" type="button" aria-label="Close terminal"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.4"/></svg></button></div>' +
      '<div class="term__out" aria-live="polite"></div>' +
      '<form class="term__form" autocomplete="off"><span aria-hidden="true">$</span><label class="sr-only" for="term-in">Command</label><input id="term-in" type="text" spellcheck="false" autocapitalize="off" /></form>';
    document.body.appendChild(term);
    out = term.querySelector('.term__out');
    input = term.querySelector('input');
    term.querySelector('.term__close').addEventListener('click', close);
    term.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; run(v); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { if (hi > 0) { hi--; input.value = hist[hi]; } e.preventDefault(); }
      else if (e.key === 'ArrowDown') { if (hi < hist.length - 1) { hi++; input.value = hist[hi]; } else { hi = hist.length; input.value = ''; } e.preventDefault(); }
      else if (e.key === 'Tab') { e.preventDefault(); complete(); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
      else if (e.key === '`' && !input.value) { e.preventDefault(); close(); }
    });
    term.addEventListener('click', function (e) { if (!e.target.closest('a,button') && !getSelection().toString()) input.focus(); });
    var n = AG.now();
    print([
      sun(esc(D.name)) + dim(' · zeitgeber shell'),
      dim('local ' + n.hhmm + ' · ZT' + AG.pad(Math.floor(n.zt)) + ' · ' + AG.phase(n.zt).name.toLowerCase()),
      'type ' + sun('help') + ' to see what this can do.',
      ''
    ]);
  }
  function open() {
    build();
    opener = document.activeElement;
    term.classList.add('is-open');
    setTimeout(function () { input.focus(); }, 60);
  }
  function close() {
    if (!term) return;
    term.classList.remove('is-open');
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
  }
  AG.terminal = { open: open, close: close };

  document.addEventListener('keydown', function (e) {
    if (e.key !== '`' || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
    e.preventDefault();
    if (term && term.classList.contains('is-open')) close(); else open();
  });
  AG.$$('[data-term-open]').forEach(function (b) { b.addEventListener('click', open); });
})();
