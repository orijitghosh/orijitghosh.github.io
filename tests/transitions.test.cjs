const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../assets/js/site.js'), 'utf8');

function root() {
  const classes = new Set();
  const styles = new Map();
  const attributes = new Map([['data-theme', 'light']]);
  return {
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name),
    },
    style: {
      setProperty: (name, value) => styles.set(name, value),
      removeProperty: name => styles.delete(name),
      getPropertyValue: name => styles.get(name) || '',
    },
    getAttribute: name => attributes.get(name),
    setAttribute: (name, value) => attributes.set(name, value),
  };
}

function themeContext({ reduced = false, supported = true, rejected = false } = {}) {
  const d = root();
  const storage = new Map();
  const events = [];
  let complete;
  let captured;
  const finished = new Promise(resolve => { complete = resolve; });
  const context = {
    d, AG: {}, reduceMQ: { matches: reduced },
    innerWidth: 1000, innerHeight: 800,
    $: () => null, $$: () => [],
    localStorage: { setItem: (key, value) => storage.set(key, value) },
    dispatchEvent: event => events.push(event),
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    document: supported ? {
      startViewTransition(apply) {
        captured = {
          x: d.style.getPropertyValue('--theme-x'),
          y: d.style.getPropertyValue('--theme-y'),
          radius: d.style.getPropertyValue('--theme-radius'),
        };
        apply();
        return { ready: rejected ? Promise.reject(new Error('Skipped')) : Promise.resolve(), finished };
      },
    } : {},
  };
  vm.runInNewContext(source.slice(source.indexOf('  var metaTheme ='), source.indexOf('  /* ═══ 8. CURSOR')), context);
  return { context, d, storage, events, complete, captured: () => captured };
}

test('theme reveal geometry is ready before the browser captures the transition', async () => {
  const state = themeContext();
  state.context.AG.setTheme('dark', { x: 0, y: 0 });
  const geometry = state.captured();
  assert.equal(geometry.x, '0px');
  assert.equal(geometry.y, '0px');
  assert.ok(parseFloat(geometry.radius) >= Math.hypot(1000, 800));
  assert.equal(state.d.getAttribute('data-theme'), 'dark');
  assert.equal(state.storage.get('ag-theme'), 'dark');
  assert.equal(state.events[0].detail.theme, 'dark');
  state.complete();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.d.classList.contains('theme-vt'), false);
  assert.equal(state.d.style.getPropertyValue('--theme-x'), '');
});

test('a skipped theme transition still applies the theme and cleans up', async () => {
  const state = themeContext({ rejected: true });
  state.context.AG.setTheme('dark', { x: 500, y: 400 });
  state.complete();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.d.getAttribute('data-theme'), 'dark');
  assert.equal(state.d.classList.contains('theme-vt'), false);
});

for (const options of [{ reduced: true }, { supported: false }]) {
  test(`theme changes without animation when ${options.reduced ? 'motion is reduced' : 'view transitions are unavailable'}`, () => {
    const state = themeContext(options);
    state.context.AG.setTheme('dark', { x: 500, y: 400 });
    assert.equal(state.d.getAttribute('data-theme'), 'dark');
    assert.equal(state.captured(), undefined);
    assert.equal(state.d.classList.contains('theme-vt'), false);
  });
}

test('incoming curtain stays covered for a frame before lifting', () => {
  const d = root();
  const curtain = root();
  const frames = [];
  const timers = [];
  d.classList.add('curtain-in');
  const context = {
    d, curtain, startReveals() {},
    requestAnimationFrame: callback => frames.push(callback),
    setTimeout: callback => timers.push(callback),
  };
  vm.runInNewContext(source.slice(source.indexOf('  function go()'), source.indexOf('  function intro(done)')), context);
  context.go();
  frames.shift()();
  assert.equal(curtain.classList.contains('is-lifting'), false);
  frames.shift()();
  assert.equal(curtain.classList.contains('is-lifting'), true);
  timers.shift()();
  assert.equal(d.classList.contains('curtain-in'), false);
  assert.equal(curtain.classList.contains('is-lifting'), false);
});
