#!/usr/bin/env node
'use strict';

/**
 * Hivision 兼容的最小 mock：任意 POST /human_matting /add_background /idphoto
 * 都返回一张真实 RGBA PNG 的 base64。用于没有 GPU / 不想拉大镜像时联调小程序。
 *
 *   node scripts/mock-hivision.js
 *   默认 http://127.0.0.1:8080
 */
const http = require('http');
const { URL } = require('url');

const SAMPLE_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR42mNgoBo4oaHxHxkPSgW4AADXLinNkoCtqAAAAABJRU5ErkJggg==';

function send(res, code, body) {
  const json = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end(json);
}

function handler(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (req.method === 'OPTIONS') {
    send(res, 204, { status: true });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/health') {
    send(res, 200, { status: true, mock: true });
    return;
  }
  if (req.method !== 'POST') {
    send(res, 404, { status: false, error: 'not found' });
    return;
  }
  const ok = {
    status: true,
    image_base64: SAMPLE_PNG_B64,
    image_base64_standard: SAMPLE_PNG_B64,
    image_base64_hd: SAMPLE_PNG_B64
  };
  if (
    url.pathname === '/human_matting' ||
    url.pathname === '/add_background' ||
    url.pathname === '/idphoto'
  ) {
    send(res, 200, ok);
    return;
  }
  send(res, 404, { status: false, error: 'unknown path' });
}

function start(port) {
  const listenPort = Number(port || process.env.PORT || 8080);
  const server = http.createServer(handler);
  server.listen(listenPort, '0.0.0.0', () => {
    console.log(`mock Hivision listening on http://127.0.0.1:${listenPort}`);
  });
  return server;
}

if (require.main === module) {
  start();
}

module.exports = {
  start,
  SAMPLE_PNG_B64,
  handler
};
