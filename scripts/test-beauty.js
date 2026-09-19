#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  clampSliders,
  naturalPreset,
  toHivisionBeauty,
  MODE_COMPLIANCE,
  MODE_BEAUTY,
  getCap
} = require('../constants/beauty');
const { applyWeakBeauty, isSkinTone } = require('../services/beauty/pixels');

assert.strictEqual(getCap(MODE_COMPLIANCE).max, 35);
assert.strictEqual(getCap(MODE_BEAUTY).max, 70);

const capped = clampSliders({ smooth: 90, whiten: 80, blemish: 70 }, MODE_COMPLIANCE);
assert.strictEqual(capped.smooth, 35);
assert.ok(capped.whiten <= 35);
assert.ok(capped.blemish <= 35);

const preset = naturalPreset(MODE_COMPLIANCE);
assert.ok(preset.smooth <= 20);
assert.ok(preset.whiten <= 16);
assert.ok(preset.blemish <= 12);

const hivision = toHivisionBeauty({ smooth: 28, whiten: 22, blemish: 18 });
assert.ok(hivision.whitening_strength <= 4);
assert.ok(hivision.brightness_strength <= 6);

assert.ok(isSkinTone(190, 140, 120));
assert.ok(!isSkinTone(10, 20, 200));

const w = 16;
const h = 16;
const data = new Uint8ClampedArray(w * h * 4);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    data[i] = 188;
    data[i + 1] = 136;
    data[i + 2] = 118;
    data[i + 3] = 255;
  }
}
const before = Uint8ClampedArray.from(data);
assert.strictEqual(applyWeakBeauty(data, w, h, { smooth: 0, whiten: 0, blemish: 0 }), false);

const changed = applyWeakBeauty(data, w, h, { smooth: 28, whiten: 22, blemish: 14 });
assert.ok(changed);
let diff = 0;
for (let i = 0; i < data.length; i += 4) {
  diff += Math.abs(data[i] - before[i]) + Math.abs(data[i + 1] - before[i + 1]) + Math.abs(data[i + 2] - before[i + 2]);
}
assert.ok(diff > 50, `expected visible pixel change, got ${diff}`);

console.log('beauty unit tests passed');
