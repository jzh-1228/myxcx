const { getMattingConfig } = require('../../utils/matting-config');
const { readFileBase64, writeBase64Image } = require('../../utils/file');
const { normalizeHex } = require('../../constants/matting');
const { notConfigured } = require('./errors');
const { postJson } = require('./http');
const { assertHivisionOk } = require('./parse');

function requireUrl() {
  const cfg = getMattingConfig();
  const url = cfg.webhook && cfg.webhook.url;
  if (!url) {
    throw notConfigured('webhook');
  }
  return cfg;
}

function headers(cfg) {
  const token = cfg.webhook && cfg.webhook.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function call(action, filePath, extra) {
  let cfg;
  try {
    cfg = requireUrl();
  } catch (e) {
    return Promise.reject(e);
  }
  return readFileBase64(filePath).then((imageBase64) =>
    postJson(
      cfg.webhook.url,
      Object.assign({ action, imageBase64 }, extra || {}),
      headers(cfg)
    ).then((data) => {
      const checked = assertHivisionOk(data);
      if (!checked.ok) {
        throw { code: checked.code, message: checked.message };
      }
      return checked.base64;
    })
  );
}

function matte(payload) {
  const imagePath = payload && payload.imagePath;
  if (!imagePath) {
    return Promise.reject({ code: 'MATTING_NO_IMAGE', message: '没有可抠图的照片' });
  }
  return call('matte', imagePath).then((b64) =>
    writeBase64Image(b64, 'png').then((mattePath) => ({
      mattePath,
      imagePath: mattePath
    }))
  );
}

function addBackground(payload) {
  const mattePath = payload && payload.mattePath;
  if (!mattePath) {
    return Promise.reject({ code: 'MATTING_NO_MATTE', message: '请先抠图再换底' });
  }
  let color;
  try {
    color = normalizeHex(payload.colorHex);
  } catch (e) {
    return Promise.reject(e);
  }
  return call('add_background', mattePath, { color }).then((b64) =>
    writeBase64Image(b64, 'jpg').then((imagePath) => ({
      imagePath,
      colorHex: color
    }))
  );
}

module.exports = {
  id: 'webhook',
  matte,
  addBackground
};
