/**
 * 抠图 / 换底门面。页面只依赖本文件，不要写死 Hivision 或其它厂商。
 */
const { getMattingConfig, isConfigured } = require('../utils/matting-config');
const { normalizeHex } = require('../constants/matting');
const { formatError, notConfigured } = require('./matting/errors');

function getProvider() {
  const cfg = getMattingConfig();
  if (cfg.provider === 'aliyun') {
    return require('./matting/aliyun');
  }
  if (cfg.provider === 'webhook') {
    return require('./matting/webhook');
  }
  return require('./matting/hivision');
}

function ensureReady() {
  const cfg = getMattingConfig();
  if (!isConfigured(cfg)) {
    throw notConfigured(cfg.provider);
  }
}

function matte(payload) {
  try {
    ensureReady();
  } catch (e) {
    return Promise.reject(e);
  }
  return getProvider().matte(payload);
}

function addBackground(payload) {
  try {
    ensureReady();
  } catch (e) {
    return Promise.reject(e);
  }
  return getProvider().addBackground(payload);
}

function replaceBackground(payload) {
  const imagePath = payload && (payload.sourcePath || payload.imagePath);
  const existingMatte = payload && payload.mattePath;
  let colorHex;
  try {
    colorHex = normalizeHex(payload && payload.colorHex);
  } catch (e) {
    return Promise.reject(e);
  }
  const ready = existingMatte
    ? Promise.resolve({ mattePath: existingMatte })
    : matte({ imagePath });
  return ready.then((matted) =>
    addBackground({ mattePath: matted.mattePath, colorHex }).then((bg) => ({
      sourcePath: imagePath,
      mattePath: matted.mattePath,
      imagePath: bg.imagePath,
      colorHex
    }))
  );
}

function composeIdPhoto(payload) {
  try {
    ensureReady();
  } catch (e) {
    return Promise.reject(e);
  }
  const provider = getProvider();
  const imagePath = payload && payload.imagePath;
  let colorHex;
  try {
    colorHex = normalizeHex((payload && payload.colorHex) || 'FFFFFF');
  } catch (e) {
    return Promise.reject(e);
  }
  const cut =
    typeof provider.idPhoto === 'function'
      ? provider.idPhoto({
          imagePath,
          width: payload.width,
          height: payload.height
        })
      : provider.matte({ imagePath });
  return cut.then((matted) =>
    provider.addBackground({ mattePath: matted.mattePath, colorHex }).then((bg) => ({
      sourcePath: imagePath,
      mattePath: matted.mattePath,
      imagePath: bg.imagePath,
      colorHex
    }))
  );
}

function showError(err) {
  const msg = formatError(err);
  const code = err && err.code;
  if (
    code === 'MATTING_NOT_CONFIGURED' ||
    code === 'MATTING_DOMAIN' ||
    code === 'MATTING_PROVIDER_STUB' ||
    msg.length > 22
  ) {
    wx.showModal({
      title: '无法抠图',
      content: msg,
      showCancel: false
    });
    return;
  }
  wx.showToast({ title: msg, icon: 'none', duration: 2200 });
}

module.exports = {
  getProvider,
  isConfigured,
  matte,
  addBackground,
  replaceBackground,
  composeIdPhoto,
  formatError,
  showError
};
