#!/usr/bin/env node
'use strict';

const http = require('http');
const assert = require('assert');
const { normalizeHex, nameToHex, hexToName } = require('../constants/matting');
const { assertHivisionOk, stripDataUrl } = require('../services/matting/parse');
const { notConfigured, formatError } = require('../services/matting/errors');
const { SAMPLE_PNG_B64, start } = require('./mock-hivision');

assert.strictEqual(normalizeHex('#438edb'), '438EDB');
assert.strictEqual(normalizeHex('fff'), 'FFFFFF');
assert.strictEqual(nameToHex('白'), 'FFFFFF');
assert.strictEqual(nameToHex('蓝'), '438EDB');
assert.strictEqual(nameToHex('红'), 'C9372C');
assert.strictEqual(hexToName('FFFFFF'), '白');
assert.strictEqual(hexToName('#C9372C'), '红');

let threw = false;
try {
  normalizeHex('zzzzzz');
} catch (e) {
  threw = e.code === 'MATTING_BAD_COLOR';
}
assert.ok(threw, 'invalid hex should throw');

const parsed = assertHivisionOk({ status: true, image_base64: `data:image/png;base64,${SAMPLE_PNG_B64}` });
assert.ok(parsed.ok);
assert.strictEqual(parsed.base64, SAMPLE_PNG_B64);

const failed = assertHivisionOk({ status: false });
assert.ok(!failed.ok);
assert.strictEqual(failed.code, 'MATTING_FAILED');

const empty = assertHivisionOk({ status: true });
assert.ok(!empty.ok);

const cfgErr = notConfigured('hivision');
assert.strictEqual(cfgErr.code, 'MATTING_NOT_CONFIGURED');
assert.ok(formatError(cfgErr).indexOf('设置') !== -1);
assert.ok(formatError(cfgErr).indexOf('baseUrl') !== -1);

const png = Buffer.from(stripDataUrl(SAMPLE_PNG_B64), 'base64');
assert.ok(png[0] === 0x89 && png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47);

const server = start(18080);
server.on('listening', () => {
  const req = http.request(
    {
      hostname: '127.0.0.1',
      port: 18080,
      path: '/human_matting',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    },
    (res) => {
      let raw = '';
      res.on('data', (c) => {
        raw += c;
      });
      res.on('end', () => {
        const body = JSON.parse(raw);
        const checked = assertHivisionOk(body);
        assert.ok(checked.ok);
        const out = Buffer.from(checked.base64, 'base64');
        assert.ok(out.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])));
        server.close();
        console.log('matting unit tests passed');
      });
    }
  );
  req.on('error', (err) => {
    server.close();
    console.error(err);
    process.exit(1);
  });
  req.end('input_image_base64=dGVzdA==');
});
