const { runChecklist, sampleBorderStats, isBeautyOverCompliance } = require('./audit/checks');
const { DISCLAIMER } = require('../constants/export');

function createCanvas(w, h) {
  if (typeof wx.createOffscreenCanvas !== 'function') return null;
  try {
    return wx.createOffscreenCanvas({ type: '2d', width: w, height: h });
  } catch (e) {
    return null;
  }
}

function loadImage(canvas, src) {
  return new Promise((resolve, reject) => {
    if (!canvas || typeof canvas.createImage !== 'function') {
      reject(new Error('no canvas image'));
      return;
    }
    const img = canvas.createImage();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('load fail'));
    img.src = src;
  });
}

function sampleBorder(imagePath, maxEdge) {
  if (!imagePath || typeof wx.getImageInfo !== 'function') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    wx.getImageInfo({
      src: imagePath,
      success(info) {
        const cap = maxEdge || 240;
        const scale = Math.min(1, cap / Math.max(info.width || cap, info.height || cap));
        const w = Math.max(2, Math.round((info.width || 2) * scale));
        const h = Math.max(2, Math.round((info.height || 2) * scale));
        const canvas = createCanvas(w, h);
        if (!canvas) {
          resolve(null);
          return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx || typeof ctx.getImageData !== 'function') {
          resolve(null);
          return;
        }
        loadImage(canvas, imagePath)
          .then((img) => {
            ctx.drawImage(img, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            resolve(sampleBorderStats(imageData.data, w, h));
          })
          .catch(() => resolve(null));
      },
      fail() {
        resolve(null);
      }
    });
  });
}

function evaluate(payload) {
  const report = runChecklist(payload || {});
  report.disclaimer = DISCLAIMER;
  return report;
}

function inspectAndEvaluate(payload) {
  const src = payload || {};
  const imagePath = src.imagePath || '';
  const needSample = !!(src.hasMatte && src.bgHex) && !src.borderStats;
  const sampling = needSample ? sampleBorder(imagePath) : Promise.resolve(src.borderStats || null);
  return sampling.then((borderStats) =>
    evaluate(
      Object.assign({}, src, {
        borderStats: borderStats || src.borderStats
      })
    )
  );
}

module.exports = {
  evaluate,
  inspectAndEvaluate,
  sampleBorder,
  isBeautyOverCompliance,
  DISCLAIMER
};
