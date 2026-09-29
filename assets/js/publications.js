/* ═══════════════════════════════════════════════════════════════════
   publications.js — filter pill, live search with highlighting,
   year histogram that doubles as navigation, and a scroll-spy.
   Press "/" to search, Esc to clear.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var AG = window.AG;
  if (!AG) return;
  var $ = AG.$, $$ = AG.$$, reduced = AG.reduced();
  var root = $('[data-pubs]');
  if (!root) return;

  var seg = $('[data-seg]', root), pill = $('.seg__pill', seg), btns = $$('[data-filter]', seg);
  var input = $('[data-search]', root), status = $('[data-status]', root), empty = $('[data-empty]', root);
  var groups = $$('[data-ygroup]', root), pubs = $$('[data-pub]', root), bars = $$('.ybar');
  var total = pubs.length, filter = 'all', query = '';

  function fold(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  pubs.forEach(function (p) {
    p._text = fold(p.getAttribute('data-search'));
    p._hl = $$('.pub__title, .pub__authors, .pub__venue', p);
    p._hl.forEach(function (el) { el._orig = el.innerHTML; });
    p._vis = true;
  });

  /* ── segmented pill ────────────────────────────────────────────── */
  function placePill(animate) {
    var on = btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0];
    if (!on || !pill) return;
    if (!animate) pill.style.transition = 'none';
    pill.style.setProperty('--x', on.offsetLeft + 'px');
    pill.style.setProperty('--w', on.offsetWidth + 'px');
    if (!animate) { void pill.offsetWidth; pill.style.transition = ''; }
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      filter = b.getAttribute('data-filter');
      placePill(true);
      apply();
    });
  });
  placePill(false);
  if (document.fonts) document.fonts.ready.then(function () { placePill(false); });
  addEventListener('resize', function () { placePill(false); });

  /* ── highlighting ──────────────────────────────────────────────── */
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function highlight(el, terms) {
    el.innerHTML = el._orig;
    if (!terms.length) return;
    var re = new RegExp('(' + terms.map(esc).join('|') + ')', 'gi');
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var raw = n.nodeValue, folded = fold(raw);
      if (folded.length !== raw.length) return; /* composed characters: skip rather than misalign */
      re.lastIndex = 0;
      if (!re.test(folded)) return;
      re.lastIndex = 0;
      var frag = document.createDocumentFragment(), last = 0, m;
      while ((m = re.exec(folded))) {
        if (m.index > last) frag.appendChild(document.createTextNode(raw.slice(last, m.index)));
        var mk = document.createElement('mark'); mk.textContent = raw.slice(m.index, m.index + m[0].length);
        frag.appendChild(mk);
        last = m.index + m[0].length;
        if (!m[0].length) re.lastIndex++;
      }
      if (last < raw.length) frag.appendChild(document.createTextNode(raw.slice(last)));
      n.parentNode.replaceChild(frag, n);
    });
  }

  /* ── filter + search ───────────────────────────────────────────── */
  function apply() {
    var terms = fold(query).split(/\s+/).filter(Boolean);
    var shown = 0, entering = [];
    pubs.forEach(function (p) {
      var ok = filter === 'all' || (filter === 'first' ? p.getAttribute('data-first') === '1' : p.getAttribute('data-selected') === '1');
      if (ok && terms.length) ok = terms.every(function (t) { return p._text.indexOf(t) !== -1; });
      if (ok && !p._vis) entering.push(p);
      p._vis = ok;
      p.classList.toggle('is-hidden', !ok);
      if (ok) { shown++; p._hl.forEach(function (el) { highlight(el, terms); }); }
    });
    groups.forEach(function (g) {
      var any = $$('[data-pub]', g).some(function (p) { return p._vis; });
      g.classList.toggle('is-hidden', !any);
    });
    if (empty) empty.hidden = shown !== 0;
    var parts = [shown + ' of ' + total];
    if (filter === 'first') parts.push('first or co-first author');
    else if (filter === 'selected') parts.push('selected');
    if (terms.length) parts.push('matching “' + query.trim() + '”');
    status.textContent = !terms.length && filter === 'all' ? 'Showing all ' + total : parts.join(' · ');
    if (!reduced && entering.length && entering[0].animate) {
      entering.slice(0, 14).forEach(function (p, i) {
        p.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
          { duration: 600, delay: i * 35, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
      });
    }
    AG._fxDirty = true;
  }

  var tm;
  if (input) {
    input.addEventListener('input', function () {
      clearTimeout(tm);
      tm = setTimeout(function () { query = input.value; apply(); }, 110);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && input.value) { e.stopPropagation(); input.value = ''; query = ''; apply(); }
    });
  }
  addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
    e.preventDefault();
    input.focus();
    input.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  });

  /* ── year bars: click to jump ──────────────────────────────────── */
  bars.forEach(function (b) {
    b.addEventListener('click', function () {
      var y = b.getAttribute('data-year'), g = document.getElementById('y' + y);
      if (!g) return;
      if (g.classList.contains('is-hidden')) {
        filter = 'all'; query = ''; if (input) input.value = '';
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-filter') === 'all')); });
        placePill(true); apply();
      }
      g.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      var first = $('.pub:not(.is-hidden) a', g);
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, reduced ? 0 : 700);
    });
  });

  /* ── scroll-spy: the year currently on screen lights up ────────── */
  function setCurrent(y) {
    groups.forEach(function (g) { g.classList.toggle('is-current', g.getAttribute('data-ygroup') === y); });
    bars.forEach(function (b) { b.classList.toggle('is-current', b.getAttribute('data-year') === y); });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setCurrent(e.target.getAttribute('data-ygroup')); });
    }, { rootMargin: '-30% 0px -65% 0px' });
    groups.forEach(function (g) { io.observe(g); });
  }

  /* Pre-fill from ?q= so searches can be linked */
  try {
    var q = new URLSearchParams(location.search).get('q');
    if (q && input) { input.value = q; query = q; apply(); }
  } catch (e) {}
})();
