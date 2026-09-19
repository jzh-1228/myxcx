const { getBeautyConfig } = require('../../utils/beauty-config');
const { writeBase64Image } = require('../../utils/file');
const { joinUrl, parseBody } = require('../matting/http');
const { readFileBase64 } = require('../../utils/file');
const { assertHivisionOk } = require('../matting/parse');
const { toHivisionBeauty } = require('../../constants/beauty');
const { remoteMissing, beautyError } = require('./errors');
const { networkError } = require('../matting/errors');

function postBeauty(url, filePath, formData, timeoutMs) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url,
      filePath,
      name: 'input_image',
      timeout: timeoutMs || 60000,
      formData: formData || {},
      success(res) {
        if (res.statusCode === 404) {
          reject(remoteMissing());
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(beautyError('BEAUTY_REMOTE_FAILED', `美颜服务 HTTP ${res.statusCode}`));
          return;
        }
        const data = parseBody(res.data);
        if (!data) {
          reject(beautyError('BEAUTY_BAD_RESPONSE', '美颜服务返回无法解析'));
          return;
        }
        resolve(data);
      },
      fail(err) {
        reject(err);
      }
    });
  }).catch((err) => {
    if (err && err.code === 'BEAUTY_REMOTE_MISSING') throw err;
    const msg = (err && err.errMsg) || '';
    if (!msg) throw err;
    return readFileBase64(filePath).then(
      (b64) =>
        new Promise((resolve, reject) => {
          wx.request({
            url,
            method: 'POST',
            timeout: timeoutMs || 60000,
            header: { 'content-type': 'application/x-www-form-urlencoded' },
            data: Object.assign({}, formData || {}, { input_image_base64: b64 }),
            success(res) {
              if (res.statusCode === 404) {
                reject(remoteMissing());
                return;
              }
              if (res.statusCode < 200 || res.statusCode >= 300) {
                reject(beautyError('BEAUTY_REMOTE_FAILED', `美颜服务 HTTP ${res.statusCode}`));
                return;
              }
              const data = parseBody(res.data);
              if (!data) {
                reject(beautyError('BEAUTY_BAD_RESPONSE', '美颜服务返回无法解析'));
                return;
              }
              resolve(data);
            },
            fail(e) {
              reject(networkError(e));
            }
          });
        })
    );
  });
}

function beautify(payload) {
  const cfg = getBeautyConfig();
  if (!cfg.baseUrl) {
    return Promise.reject(remoteMissing());
  }
  const hivision = toHivisionBeauty(payload || {});
  const form = {
    smooth: String((payload && payload.smooth) || 0),
    whiten: String((payload && payload.whiten) || 0),
    denoise: String((payload && payload.blemish) || 0),
    blemish: String((payload && payload.blemish) || 0),
    whitening_strength: String(hivision.whitening_strength),
    brightness_strength: String(hivision.brightness_strength)
  };
  const url = joinUrl(cfg.baseUrl, cfg.path || '/beautify');
  return postBeauty(url, payload.imagePath, form, cfg.timeoutMs).then((data) => {
    const checked = assertHivisionOk(data);
    if (!checked.ok) {
      throw beautyError(checked.code, checked.message);
    }
    return writeBase64Image(checked.base64, 'jpg').then((imagePath) => ({
      imagePath,
      provider: 'http',
      label: '云端美颜'
    }));
  });
}

module.exports = {
  id: 'http',
  beautify
};
