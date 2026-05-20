/* ═══════════════════════════════════════════════
   terminal-easteregg.js
   Interactive terminal at the bottom of every page
   ═══════════════════════════════════════════════ */

(function () {
  const COMMANDS = {
    help: () => [
      'available commands:',
      '  help               — show this message',
      '  ls                 — list pages',
      '  cat bio            — print bio',
      '  whoami             — current user',
      '  open <page>        — navigate (about|publications|cv|repositories|teaching)',
      '  contact            — email + links',
      '  scholar            — open google scholar',
      '  github             — open github profile',
      '  pwd                — print working directory',
      '  date               — show current date/time',
      '  clear              — clear terminal',
      '  exit               — close terminal'
    ],
    ls: () => [
      'about.sh           publications.md',
      'cv.yml             repositories.json',
      'teaching.md        bio.txt'
    ],
    'cat bio': () => [
      'Arijit Ghosh — visiting postdoctoral fellow, NHLBI / NIH.',
      'Studies the interaction between circadian clock and sleep',
      'genetic networks in Drosophila melanogaster.',
      'Bethesda, MD · arijitghosh2009@gmail.com'
    ],
    whoami: () => ['visitor@arijit-ghosh'],
    pwd: () => [window.location.pathname || '/'],
    date: () => [new Date().toString()],
    contact: () => [
      'email   : arijitghosh2009@gmail.com',
      'scholar : https://scholar.google.co.in/citations?user=Nuaw_FoAAAAJ',
      'github  : https://github.com/orijitghosh',
      'lab     : https://www.nhlbi.nih.gov/science/systems-genetics'
    ],
    scholar: () => {
      window.open('https://scholar.google.co.in/citations?user=Nuaw_FoAAAAJ&hl=en', '_blank');
      return ['opening google scholar...'];
    },
    github: () => {
      window.open('https://github.com/orijitghosh', '_blank');
      return ['opening github...'];
    },
    'open about':       () => { goTo('index.html'); return ['$ cd ~/about/']; },
    'open publications':() => { goTo('publications.html'); return ['$ cd ~/publications/']; },
    'open cv':          () => { goTo('cv.html'); return ['$ cd ~/cv/']; },
    'open repositories':() => { goTo('repositories.html'); return ['$ cd ~/repositories/']; },
    'open teaching':    () => { goTo('teaching.html'); return ['$ cd ~/teaching/']; },
  };

  function goTo(href) {
    triggerPageTransition('cd ' + href.replace('.html', '/'));
    setTimeout(() => { window.location.href = href; }, 600);
  }

  function buildUI() {
    const wrap = document.createElement('div');
    wrap.id = 'term-easter';
    wrap.innerHTML = `
      <button id="term-toggle" title="Open terminal (or press \`)">
        <span style="color:var(--green);">$</span> <span class="term-toggle-cursor">_</span>
      </button>
      <div id="term-window" style="display:none;">
        <div id="term-header">
          <span style="color:var(--muted);font-size:13px;">visitor@arijit-ghosh:~$</span>
          <button id="term-close" title="Close (Esc)">×</button>
        </div>
        <div id="term-output"></div>
        <form id="term-form">
          <span class="term-prompt">$</span>
          <input id="term-input" autocomplete="off" spellcheck="false" />
        </form>
      </div>
    `;
    document.body.appendChild(wrap);

    const toggle = document.getElementById('term-toggle');
    const win = document.getElementById('term-window');
    const closeBtn = document.getElementById('term-close');
    const input = document.getElementById('term-input');
    const output = document.getElementById('term-output');
    const form = document.getElementById('term-form');

    function openTerm() {
      win.style.display = 'flex';
      toggle.style.display = 'none';
      setTimeout(() => input.focus(), 50);
      if (output.childElementCount === 0) {
        printLine('Welcome. Type <span style="color:var(--tan)">help</span> to see commands.', true);
        printLine('');
      }
    }
    function closeTerm() {
      win.style.display = 'none';
      toggle.style.display = '';
    }

    toggle.addEventListener('click', openTerm);
    closeBtn.addEventListener('click', closeTerm);
    document.addEventListener('keydown', (e) => {
      if (e.key === '`' && document.activeElement !== input) {
        e.preventDefault();
        if (win.style.display === 'none') openTerm(); else closeTerm();
      }
      if (e.key === 'Escape' && win.style.display !== 'none') closeTerm();
    });

    function printLine(html, isHtml) {
      const div = document.createElement('div');
      div.className = 'term-line';
      if (isHtml) div.innerHTML = html;
      else div.textContent = html;
      output.appendChild(div);
      output.scrollTop = output.scrollHeight;
    }

    const history = [];
    let histIdx = -1;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const cmd = input.value.trim();
      if (!cmd) return;
      history.push(cmd); histIdx = history.length;
      printLine('<span style="color:var(--green);">$</span> ' + cmd, true);

      if (cmd === 'clear') { output.innerHTML = ''; }
      else if (cmd === 'exit') { closeTerm(); }
      else {
        const fn = COMMANDS[cmd] || COMMANDS[cmd.toLowerCase()];
        if (fn) {
          const lines = fn();
          lines.forEach(l => printLine(l));
        } else {
          printLine('bash: ' + cmd + ': command not found. type "help"');
        }
      }
      printLine('');
      input.value = '';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        if (histIdx > 0) { histIdx--; input.value = history[histIdx]; }
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        if (histIdx < history.length - 1) { histIdx++; input.value = history[histIdx]; }
        else { histIdx = history.length; input.value = ''; }
        e.preventDefault();
      }
    });
  }

  // ─── PAGE TRANSITION OVERLAY ───
  function triggerPageTransition(cmd) {
    let overlay = document.getElementById('page-transition');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'page-transition';
      overlay.innerHTML = `
        <div class="pt-line"><span class="pt-prompt">$</span> <span class="pt-cmd"></span><span class="pt-cursor">_</span></div>
        <div class="pt-line pt-loading">loading<span class="pt-dots">...</span></div>
      `;
      document.body.appendChild(overlay);
    }
    overlay.querySelector('.pt-cmd').textContent = cmd;
    overlay.classList.add('active');
  }

  function hookPageLinks() {
    document.querySelectorAll('.top-bar__tab').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('http')) return;
      if (a.classList.contains('top-bar__tab--active')) {
        a.addEventListener('click', (e) => e.preventDefault());
        return;
      }
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const pageName = href.replace('.html', '');
        triggerPageTransition('cd ~/' + pageName + '/');
        setTimeout(() => { window.location.href = href; }, 500);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildUI();
    hookPageLinks();
  });
})();
