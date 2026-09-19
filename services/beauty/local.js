const { writeBase64Image } = require('../../utils/file');
const { applyWeakBeauty } = require('./pixels');
const { localUnavailable } = require('./errors');

function getImageInfo(src) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: resolve,
      fail: (err) => {
        reject({
          code: 'BEAUTY_NO_IMAGE',
          message: '无法读取照片信息',
          cause: err
        });
      }
    });
  });
}

function loadImage(canvas, src) {
  return new Promise((resolve, reject) => {
    if (!canvas || typeof canvas.createImage !== 'function') {
      reject(localUnavailable());
      return;
    }
    const img = canvas.createImage();
    img.onload = () => resolve(img);
    img.onerror = () => reject(localUnavailable());
    img.src = src;
  });
}

function exportCanvas(canvas) {
  return new Promise((resolve, reject) => {
    if (canvas && typeof canvas.toDataURL === 'function') {
      try {
        const url = canvas.toDataURL('image/jpeg', 0.92);
        if (url && url.indexOf('base64,') !== -1) {
          writeBase64Image(url, 'jpg').then(resolve).catch(reject);
          return;
        }
      } catch (e) {
        /* fallback */
      }
    }
    if (typeof wx.canvasToTempFilePath !== 'function') {
      reject(localUnavailable());
      return;
    }
    wx.canvasToTempFilePath({
      canvas,
      fileType: 'jpg',
      quality: 0.92,
      success(res) {
        resolve(res.tempFilePath);
      },
      fail() {
        reject(localUnavailable());
      }
    });
  });
}

function createCanvas(w, h) {
  if (typeof wx.createOffscreenCanvas !== 'function') {
    return null;
  }
  try {
    return wx.createOffscreenCanvas({ type: '2d', width: w, height: h });
  } catch (e) {
    return null;
  }
}

function beautify(payload) {
  const imagePath = payload && payload.imagePath;
  if (!imagePath) {
    return Promise.reject({ code: 'BEAUTY_NO_IMAGE', message: '没有可美颜的照片' });
  }
  const smooth = (payload && payload.smooth) || 0;
  const whiten = (payload && payload.whiten) || 0;
  const blemish = (payload && payload.blemish) || 0;
  if (smooth <= 0 && whiten <= 0 && blemish <= 0) {
    return Promise.resolve({
      imagePath,
      provider: 'local',
      label: '本地轻处理',
      unchanged: true
    });
  }

  return getImageInfo(imagePath).then((info) => {
    const maxW = 720;
    const scale = Math.min(1, maxW / (info.width || maxW));
    const w = Math.max(2, Math.round((info.width || 2) * scale));
    const h = Math.max(2, Math.round((info.height || 2) * scale));
    const canvas = createCanvas(w, h);
    if (!canvas) {
      return Promise.reject(localUnavailable());
    }
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof ctx.getImageData !== 'function') {
      return Promise.reject(localUnavailable());
    }
    return loadImage(canvas, imagePath).then((img) => {
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const changed = applyWeakBeauty(imageData.data, w, h, { smooth, whiten, blemish });
      if (!changed) {
        return {
          imagePath,
          provider: 'local',
          label: '本地轻处理',
          unchanged: true
        };
      }
      ctx.putImageData(imageData, 0, 0);
      return exportCanvas(canvas).then((path) => ({
        imagePath: path,
        provider: 'local',
        label: '本地轻处理'
      }));
    });
  });
}

module.exports = {
  id: 'local',
  beautify
};
