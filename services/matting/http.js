const { getMattingConfig } = require('../../utils/matting-config');
const { readFileBase64 } = require('../../utils/file');
const { networkError, failed, badResponse } = require('./errors');
const { assertHivisionOk } = require('./parse');

function joinUrl(base, pathname) {
  const root = String(base || '').replace(/\/+$/, '');
  const path = pathname.charAt(0) === '/' ? pathname : `/${pathname}`;
  return `${root}${path}`;
}

function parseBody(raw) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function postMultipart(url, filePath, formData, timeoutMs) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url,
      filePath,
      name: 'input_image',
      timeout: timeoutMs || 60000,
      formData: formData || {},
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(failed(`服务 HTTP ${res.statusCode}`));
          return;
        }
        const data = parseBody(res.data);
        if (!data) {
          reject(badResponse());
          return;
        }
        resolve(data);
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

function postFormBase64(url, filePath, formData, timeoutMs) {
  return readFileBase64(filePath).then(
    (b64) =>
      new Promise((resolve, reject) => {
        wx.request({
          url,
          method: 'POST',
          timeout: timeoutMs || 60000,
          header: {
            'content-type': 'application/x-www-form-urlencoded'
          },
          data: Object.assign({}, formData || {}, { input_image_base64: b64 }),
          success(res) {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(failed(`服务 HTTP ${res.statusCode}`));
              return;
            }
            const data = parseBody(res.data);
            if (!data) {
              reject(badResponse());
              return;
            }
            resolve(data);
          },
          fail(err) {
            reject(networkError(err));
          }
        });
      })
  );
}

function postFile(url, filePath, formData) {
  const timeoutMs = getMattingConfig().timeoutMs;
  return postMultipart(url, filePath, formData, timeoutMs)
    .catch((err) => {
      const msg = (err && err.errMsg) || '';
      if (msg.indexOf('fail') !== -1 || (err && err.errMsg)) {
        return postFormBase64(url, filePath, formData, timeoutMs);
      }
      throw err;
    })
    .then((data) => {
      const checked = assertHivisionOk(data);
      if (!checked.ok) {
        throw { code: checked.code, message: checked.message };
      }
      return Object.assign({}, data, { _imageBase64: checked.base64 });
    })
    .catch((err) => {
      if (err && err.code) throw err;
      throw networkError(err);
    });
}

function postJson(url, body, headers) {
  const timeoutMs = getMattingConfig().timeoutMs;
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'POST',
      timeout: timeoutMs,
      header: Object.assign({ 'content-type': 'application/json' }, headers || {}),
      data: body,
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(failed(`服务 HTTP ${res.statusCode}`));
          return;
        }
        const data = parseBody(res.data);
        if (!data) {
          reject(badResponse());
          return;
        }
        resolve(data);
      },
      fail(err) {
        reject(networkError(err));
      }
    });
  });
}

module.exports = {
  joinUrl,
  postFile,
  postJson,
  parseBody
};
