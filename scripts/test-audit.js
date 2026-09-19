#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { findSpec } = require('../constants/specs');
const { DISCLAIMER } = require('../constants/export');
const { MODE_BEAUTY, MODE_COMPLIANCE } = require('../constants/beauty');
const {
  sampleBorderStats,
  checkPixelSize,
  checkAspect,
  checkBackground,
  checkFileSize,
  checkBeauty,
  checkFace,
  isBeautyOverCompliance,
  runChecklist
} = require('../services/audit/checks');

const one = findSpec('one-inch');
assert.ok(one.width === 295 && one.mmWidth === 25);
assert.ok(DISCLAIMER.indexOf('本地预检') !== -1);
assert.ok(DISCLAIMER.indexOf('受理机关') !== -1);

const exact = checkPixelSize({ width: 295, height: 413, spec: one });
assert.strictEqual(exact.status, 'pass');

const near = checkPixelSize({ width: 300, height: 420, spec: one });
assert.strictEqual(near.status, 'warn');

const far = checkPixelSize({ width: 800, height: 600, spec: one });
assert.strictEqual(far.status, 'fail');

const noSpec = checkPixelSize({ width: 800, height: 600 });
assert.strictEqual(noSpec.status, 'skip');

const aspectOk = checkAspect({ width: 295, height: 413, spec: one });
assert.strictEqual(aspectOk.status, 'pass');

const aspectFail = checkAspect({ width: 413, height: 295, spec: one });
assert.strictEqual(aspectFail.status, 'fail');

const w = 32;
const h = 32;
const solid = new Uint8ClampedArray(w * h * 4);
for (let i = 0; i < solid.length; i += 4) {
  solid[i] = 255;
  solid[i + 1] = 255;
  solid[i + 2] = 255;
  solid[i + 3] = 255;
}
const solidStats = sampleBorderStats(solid, w, h);
assert.ok(solidStats.count > 0);
assert.ok(solidStats.stdL < 2);
const bgPass = checkBackground({
  hasMatte: true,
  bgHex: 'FFFFFF',
  borderStats: solidStats
});
assert.strictEqual(bgPass.status, 'pass');

const noisy = Uint8ClampedArray.from(solid);
for (let y = 0; y < 4; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    noisy[i] = x % 2 ? 10 : 240;
    noisy[i + 1] = x % 2 ? 200 : 20;
    noisy[i + 2] = 80;
  }
}
const noisyStats = sampleBorderStats(noisy, w, h);
const bgFail = checkBackground({
  hasMatte: true,
  bgHex: 'FFFFFF',
  borderStats: noisyStats
});
assert.ok(bgFail.status === 'fail' || bgFail.status === 'warn');

const bgSkip = checkBackground({ hasMatte: false, bgHex: '' });
assert.strictEqual(bgSkip.status, 'skip');

const sizePass = checkFileSize({ bytes: 40 * 1024, targetKb: 50, compressed: true });
assert.strictEqual(sizePass.status, 'pass');

const sizeWarnBefore = checkFileSize({ bytes: 180 * 1024, targetKb: 50, compressed: false });
assert.strictEqual(sizeWarnBefore.status, 'warn');

const sizeFail = checkFileSize({ bytes: 180 * 1024, targetKb: 50, compressed: true });
assert.strictEqual(sizeFail.status, 'fail');

assert.strictEqual(isBeautyOverCompliance({ smooth: 28, whiten: 22, blemish: 10 }), false);
assert.ok(isBeautyOverCompliance({ smooth: 50, whiten: 22, blemish: 10 }));
const beautyWarn = checkBeauty({
  sliders: { smooth: 50, whiten: 22, blemish: 10 },
  beautyMode: MODE_BEAUTY
});
assert.strictEqual(beautyWarn.status, 'warn');
const beautyOk = checkBeauty({
  sliders: { smooth: 18, whiten: 12, blemish: 8 },
  beautyMode: MODE_COMPLIANCE
});
assert.strictEqual(beautyOk.status, 'pass');

const face = checkFace();
assert.strictEqual(face.status, 'skip');
assert.ok(face.detail.indexOf('不假装') !== -1);

const report = runChecklist({
  width: 295,
  height: 413,
  spec: one,
  hasMatte: true,
  bgHex: 'FFFFFF',
  borderStats: solidStats,
  bytes: 48 * 1024,
  targetKb: 50,
  compressed: true,
  sliders: { smooth: 18, whiten: 12, blemish: 8 },
  beautyMode: MODE_COMPLIANCE
});
assert.strictEqual(report.items.length, 6);
assert.strictEqual(report.summary.level, 'pass');
assert.strictEqual(report.disclaimer, DISCLAIMER);
assert.strictEqual(report.beautyOverCap, false);

const over = runChecklist({
  width: 800,
  height: 600,
  spec: one,
  sliders: { smooth: 60, whiten: 40, blemish: 8 },
  beautyMode: MODE_BEAUTY,
  targetKb: 50,
  bytes: 200 * 1024
});
assert.ok(over.beautyOverCap);
assert.ok(over.summary.level === 'fail' || over.summary.level === 'warn');

console.log('audit unit tests passed');
