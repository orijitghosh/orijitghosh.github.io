'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

// Run the shipped figure code, recording the phases passed to its activity curve.
function actogram(tau) {
  const phases = [], labels = [];
  const context = new Proxy({}, { get: (o, k) => o[k] || ((...args) => { if (k === 'fillText') labels.push(args[0]); }) });
  const canvas = { clientWidth: 480, style: {}, getContext: () => context, addEventListener() {} };
  const slider = { min: '18.5', max: '29.5', value: String(tau), style: { setProperty() {} }, addEventListener() {} };
  const elements = { '[data-actogram]': canvas, '[data-tau]': slider, '[data-tau-out]': {}, '[data-acto-cap]': {} };
  const AG = {
    reduced: () => true, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), lerp: (a, b, t) => a + (b - a) * t,
    $$: () => [], activity: p => { phases.push(p); return .4; }
  };
  vm.runInNewContext(readFileSync(join(__dirname, '../assets/js/research.js'), 'utf8'), {
    window: { AG, devicePixelRatio: 1 }, document: { documentElement: {}, querySelector: s => elements[s] || null },
    getComputedStyle: () => ({ getPropertyValue: () => '#222222' }), addEventListener() {}
  });
  return { phase: (day, bin, half = 0) => phases[day * 96 + half * 48 + bin], labels };
}
const delta = (a, b) => ((b - a) % 24 + 24) % 24;
const near = (got, want) => assert.ok(Math.abs(got - want) < 1e-8, `${got} != ${want}`);

for (const [tau, expectedStep] of [[19, .631578947368421], [24, .5], [29, .413793103448276]]) {
  test(`${tau}h clock advances continuously across DD midnight`, () => {
    const a = actogram(tau);
    near(delta(a.phase(7, 47), a.phase(8, 0)), expectedStep);
    near(delta(a.phase(7, 0), a.phase(7, 1)), expectedStep);
  });
}
test('19h clock repeats after 19 hours within a DD row', () => {
  const a = actogram(19); near(a.phase(7, 0), a.phase(7, 38));
});
test('29h clock repeats after 29 hours across DD rows', () => {
  const a = actogram(29); near(a.phase(7, 0), a.phase(8, 10));
});
test('LD remains entrained and the adjacent double plots repeat the same day', () => {
  for (const tau of [19, 24, 29]) {
    const a = actogram(tau);
    near(a.phase(6, 0), .25); near(a.phase(6, 47), 23.75);
    near(a.phase(7, 15, 1), a.phase(8, 15));
    assert.ok(a.labels.includes('0 h') && !a.labels.includes('ZT 0'));
  }
});
