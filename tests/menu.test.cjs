'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

// Minimal DOM boundary: execute site.js and inspect its real focus/inert side effects.
function menuPage() {
  const events = {}, docEvents = {}, nodes = {};
  const document = { activeElement: null, hidden: false, addEventListener: (n, f) => { docEvents[n] = f; } };
  function element(name, children = []) {
    const el = { name, children, inert: false, hidden: false, disabled: false, tabIndex: 0, style: {}, attrs: {}, listeners: {},
      setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] || null; },
      addEventListener(k, f) { this.listeners[k] = f; },
      contains(n) { return n === this || children.some(c => c.contains(n)); },
      getClientRects() { return this.hidden ? [] : [1]; },
      focus() { document.activeElement = this; if (docEvents.focusin) docEvents.focusin({ target: this }); },
      querySelector(s) { return s === 'span' ? this.label : s === '.menu__link' ? this.children[0] : null; },
      querySelectorAll() { return this.children; }
    };
    nodes[name] = el; return el;
  }
  const first = element('first'), last = element('last'), menu = element('menu', [first, last]); menu.hidden = true;
  const button = element('button'); button.label = { textContent: 'Menu' };
  const brand = element('brand'), nav = element('nav'), theme = element('theme');
  const header = element('header', [brand, nav, element('tools', [theme, button])]);
  const main = element('main'), footer = element('footer'); footer.inert = true;
  document.body = element('body', [header, menu, main, footer]); document.body.style.overflow = 'scroll';
  document.documentElement = { classList: { add() {} }, getAttribute: () => 'light' };
  const selectors = { '[data-menu]': menu, '[data-menu-toggle]': button, '.nav__link[aria-current="page"]': nav, '.nav__brand': brand };
  document.querySelector = s => selectors[s] || null;
  document.querySelectorAll = () => [];
  const sandbox = { document, window: {}, innerWidth: 400, innerHeight: 800,
    matchMedia: () => ({ matches: false }), performance: { now: () => 0 },
    addEventListener: (n, f) => { events[n] = f; }, getComputedStyle: () => ({ getPropertyValue: () => '#faf7f1' }),
    setInterval() {}, setTimeout() {}, Date, Intl };
  vm.runInNewContext(readFileSync(join(__dirname, '../assets/js/site.js'), 'utf8'), sandbox);
  function key(key, shiftKey = false) {
    let prevented = false; events.keydown({ key, shiftKey, target: document.activeElement, preventDefault() { prevented = true; } }); return prevented;
  }
  return { ...nodes, document, sandbox, key, open: () => button.listeners.click(), close: () => button.listeners.click(), resize: () => events.resize() };
}
test('mobile menu makes the page and other header controls inert, restoring previous state on close', () => {
  const p = menuPage(); p.open();
  assert.equal(p.main.inert, true); assert.equal(p.brand.inert, true); assert.equal(p.theme.inert, true);
  assert.equal(p.button.inert, false); assert.equal(p.menu.inert, false);
  assert.equal(p.document.activeElement, p.first);
  p.close();
  assert.equal(p.main.inert, false); assert.equal(p.brand.inert, false); assert.equal(p.footer.inert, true);
  assert.equal(p.document.body.style.overflow, 'scroll'); assert.equal(p.document.activeElement, p.button);
});
test('Tab and Shift+Tab cycle through the menu and its close button', () => {
  const p = menuPage(); p.open();
  assert.equal(p.key('Tab'), true); assert.equal(p.document.activeElement, p.last);
  p.key('Tab'); assert.equal(p.document.activeElement, p.button);
  p.key('Tab'); assert.equal(p.document.activeElement, p.first);
  p.key('Tab', true); assert.equal(p.document.activeElement, p.button);
  p.key('Tab', true); assert.equal(p.document.activeElement, p.last);
});
test('focus that escapes an open menu returns inside and Escape restores the opener', () => {
  const p = menuPage(); p.open(); p.main.focus();
  assert.equal(p.document.activeElement, p.first);
  p.key('Escape'); assert.equal(p.menu.hidden, true); assert.equal(p.document.activeElement, p.button);
  assert.equal(p.main.inert, false);
});
test('desktop resize closes the menu and focuses visible desktop navigation', () => {
  const p = menuPage(); p.open(); p.sandbox.innerWidth = 1000; p.resize();
  assert.equal(p.menu.hidden, true); assert.equal(p.main.inert, false);
  assert.equal(p.document.activeElement, p.nav);
  assert.equal(p.key('Tab'), false);
});

test('terminal opening waits until the mobile menu is closed', () => {
  const p = menuPage();
  let appended = 0;
  const widget = { value: '', innerHTML: '', scrollHeight: 0, focus() {}, addEventListener() {}, appendChild() {},
    setAttribute() {}, classList: { add() {}, remove() {}, contains: () => false } };
  p.document.body.appendChild = () => { appended++; };
  p.document.createElement = () => ({ ...widget, querySelector: () => ({ ...widget }) });
  const query = p.document.querySelector;
  p.document.querySelector = s => s === '[data-menu-toggle][aria-expanded="true"]'
    ? (p.button.getAttribute('aria-expanded') === 'true' ? p.button : null) : query(s);
  const AG = p.sandbox.window.AG;
  AG.now = () => ({ hhmm: '12:00', zt: 6 }); AG.phase = () => ({ name: 'Siesta' });
  vm.runInNewContext(readFileSync(join(__dirname, '../assets/js/terminal.js'), 'utf8'), p.sandbox);
  p.open(); AG.terminal.open(); assert.equal(appended, 0);
  p.close(); AG.terminal.open(); assert.equal(appended, 1);
});
