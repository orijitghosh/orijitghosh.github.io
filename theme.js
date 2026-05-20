/* ═══════════════════════════════════════════════
   theme.js — shared across all pages
   Dark/light toggle, colorblind modes, clock,
   external link targets, scroll reveal
   ═══════════════════════════════════════════════ */

(function () {
  // ─── THEME ───
  const saved = localStorage.getItem('ag-theme') || 'dark';
  const savedVision = localStorage.getItem('ag-vision') || 'normal';
  document.documentElement.setAttribute('data-theme', saved);
  if (savedVision !== 'normal') document.documentElement.setAttribute('data-vision', savedVision);

  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('ag-theme', t);
    updateThemeBtn();
  }
  function setVision(v) {
    if (v === 'normal') document.documentElement.removeAttribute('data-vision');
    else document.documentElement.setAttribute('data-vision', v);
    localStorage.setItem('ag-vision', v);
    updateVisionBtn();
  }

  // ─── INJECT CONTROLS ───
  document.addEventListener('DOMContentLoaded', function () {
    const controls = document.querySelector('.top-bar__controls');
    if (!controls) return;

    // Theme toggle
    const themeBtn = document.createElement('button');
    themeBtn.className = 'ctrl-btn';
    themeBtn.id = 'theme-toggle';
    themeBtn.title = 'Toggle light/dark mode';
    controls.prepend(themeBtn);
    themeBtn.addEventListener('click', function () {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(cur === 'dark' ? 'light' : 'dark');
    });

    // Vision dropdown
    const visionBtn = document.createElement('button');
    visionBtn.className = 'ctrl-btn';
    visionBtn.id = 'vision-toggle';
    visionBtn.title = 'Color vision modes';
    controls.prepend(visionBtn);

    const visionModes = [
      { key: 'normal', label: 'Normal' },
      { key: 'deuteranopia', label: 'Deuteranopia' },
      { key: 'protanopia', label: 'Protanopia' },
      { key: 'tritanopia', label: 'Tritanopia' },
    ];
    let visionIdx = visionModes.findIndex(m => m.key === savedVision);
    if (visionIdx < 0) visionIdx = 0;

    visionBtn.addEventListener('click', function () {
      visionIdx = (visionIdx + 1) % visionModes.length;
      setVision(visionModes[visionIdx].key);
    });

    updateThemeBtn();
    updateVisionBtn();

    function updateThemeBtn() {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      themeBtn.textContent = cur === 'dark' ? '☀ light' : '☾ dark';
    }
    window.updateThemeBtn = updateThemeBtn;

    function updateVisionBtn() {
      const cur = localStorage.getItem('ag-vision') || 'normal';
      const mode = visionModes.find(m => m.key === cur) || visionModes[0];
      visionBtn.textContent = '◑ ' + mode.label;
      visionBtn.classList.toggle('ctrl-btn--active', cur !== 'normal');
    }
    window.updateVisionBtn = updateVisionBtn;

    // ─── CLOCK ───
    const clock = document.getElementById('clock');
    if (clock) {
      const tick = function () {
        const d = new Date();
        clock.textContent = d.toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
      };
      tick();
      setInterval(tick, 1000);
    }

    // ─── EXTERNAL LINKS → target="_blank" ───
    document.querySelectorAll('a[href]').forEach(function (a) {
      const href = a.getAttribute('href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    });

    // ─── SCROLL REVEAL ───
    var reveals = document.querySelectorAll('.reveal');
    if (reveals.length && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      reveals.forEach(function (el) { observer.observe(el); });
    }
  });
})();
