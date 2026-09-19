/**
 * 弱美颜门面。页面只依赖本文件。
 * auto：有 baseUrl 时先试 /beautify，没有或 404 则本地轻处理。
 */
const { clampSliders } = require('../constants/beauty');
const { getBeautyConfig, hasRemoteBeauty } = require('../utils/beauty-config');
const { notConfigured, formatError, showError } = require('./beauty/errors');

function getProvider(name) {
  if (name === 'http' || name === 'hivision') {
    return require('./beauty/http');
  }
  return require('./beauty/local');
}

function beautify(payload) {
  const cfg = getBeautyConfig();
  const sliders = clampSliders(payload || {}, payload && payload.mode);
  const body = Object.assign({}, payload, sliders);
  if (!body.imagePath) {
    return Promise.reject({ code: 'BEAUTY_NO_IMAGE', message: '没有可美颜的照片' });
  }

  const local = () => getProvider('local').beautify(body);
  const remote = () => getProvider('http').beautify(body);

  if (cfg.provider === 'local') {
    return local();
  }

  const tryRemote = cfg.provider === 'hivision' || cfg.provider === 'http' || cfg.provider === 'auto';
  if (tryRemote && hasRemoteBeauty(cfg)) {
    return remote().catch((err) => {
      if (cfg.enableLocalFallback === false) throw err;
      return local().catch((localErr) => {
        throw localErr.code === 'BEAUTY_LOCAL_UNAVAILABLE' ? notConfigured() : localErr;
      });
    });
  }

  if (cfg.enableLocalFallback !== false) {
    return local().catch((localErr) => {
      throw localErr.code === 'BEAUTY_LOCAL_UNAVAILABLE' ? notConfigured() : localErr;
    });
  }

  return Promise.reject(notConfigured());
}

module.exports = {
  beautify,
  formatError,
  showError,
  getBeautyConfig
};
