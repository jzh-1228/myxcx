#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  bytesToKb,
  kbToBytes,
  formatKb,
  parseTargetKb,
  shouldKeepPng,
  midQuality,
  qualityPercent,
  searchQuality
} = require('../services/compress/search');

assert.strictEqual(bytesToKb(51200), 50);
assert.strictEqual(bytesToKb(20480), 20);
assert.ok(Math.abs(bytesToKb(1024) - 1) < 0.01);
assert.strictEqual(kbToBytes(50), 51200);
assert.strictEqual(formatKb(50), '50KB');
assert.strictEqual(formatKb(47.2), '47.2KB');

assert.strictEqual(parseTargetKb('50'), 50);
assert.strictEqual(parseTargetKb('≤20KB'), 20);
assert.strictEqual(parseTargetKb(''), 0);
assert.strictEqual(parseTargetKb('2'), 0);
assert.ok(parseTargetKb('99999') <= 10240);

assert.strictEqual(shouldKeepPng({ needAlpha: true }), true);
assert.strictEqual(shouldKeepPng({ hasMatte: true, bgHex: '' }), true);
assert.strictEqual(shouldKeepPng({ hasMatte: true, bgHex: 'FFFFFF' }), false);
assert.strictEqual(shouldKeepPng({ hasMatte: false }), false);

assert.strictEqual(midQuality(0.12, 0.92), 0.52);
assert.strictEqual(qualityPercent(0.68), '68%');

function modelBytes(quality) {
  return Math.round(180000 * quality * quality + 8000);
}

searchQuality(50 * 1024, (q) => ({ bytes: modelBytes(q), quality: q, format: 'jpeg' }))
  .then((hit) => {
    assert.ok(hit.metTarget);
    assert.ok(hit.result.bytes <= 50 * 1024);
    assert.ok(hit.result.quality >= 0.12);
    assert.ok(hit.attempts.length >= 1);
    return searchQuality(51200, (q) => ({ bytes: 20000, quality: q }));
  })
  .then((already) => {
    assert.ok(already.metTarget);
    assert.strictEqual(already.attempts.length, 1);
    assert.ok(already.result.quality >= 0.9);
    return searchQuality(8 * 1024, (q) => ({ bytes: modelBytes(q), quality: q }));
  })
  .then((miss) => {
    assert.strictEqual(miss.metTarget, false);
    assert.ok(miss.bestEffort);
    assert.ok(miss.result.quality <= 0.2);
    return searchQuality(0, (q) => ({ bytes: 99999, quality: q }));
  })
  .then((noTarget) => {
    assert.ok(noTarget.metTarget);
    console.log('compress unit tests passed');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
