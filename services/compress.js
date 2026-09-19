const { writeBase64Image, getFileBytes } = require('../utils/file');
const { MIN_QUALITY, MAX_QUALITY } = require('../constants/export');
const {
  bytesToKb,
  kbToBytes,
  formatKb,
  parseTargetKb,
  shouldKeepPng,
  qualityPercent,
  searchQuality
} = require('./compress/search');

function compressError(code, message, extra) {
  return Object.assign({ code, message }, extra || {});
}

function getImageInfo(src) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: resolve,
      fail(err) {
        reject(compressError('COMPRESS_NO_IMAGE', '无法读取照片信息', { cause: err }));
      }
    });
  });
}

function loadImage(canvas, src) {
  return new Promise((resolve, reject) => {
    if (!canvas || typeof canvas.createImage !== 'function') {
      reject(compressError('COMPRESS_NO_CANVAS', '当前环境无法离屏重编码'));
      return;
    }
    const img = canvas.createImage();
    img.onload = () => resolve(img);
    img.onerror = () => reject(compressError('COMPRESS_NO_IMAGE', '无法载入照片'));
    img.src = src;
  });
}

function createCanvas(w, h) {
  if (typeof wx.createOffscreenCanvas !== 'function') return null;
  try {
    return wx.createOffscreenCanvas({ type: '2d', width: w, height: h });
  } catch (e) {
    return null;
  }
}

function exportCanvas(canvas, fileType, quality) {
  const type = fileType === 'png' ? 'png' : 'jpg';
  const mime = type === 'png' ? 'image/png' : 'image/jpeg';
  const q = type === 'png' ? undefined : quality;
  return new Promise((resolve, reject) => {
    if (canvas && typeof canvas.toDataURL === 'function') {
      try {
        const url = type === 'png' ? canvas.toDataURL(mime) : canvas.toDataURL(mime, q);
        if (url && url.indexOf('base64,') !== -1) {
          writeBase64Image(url, type === 'png' ? 'png' : 'jpg').then(resolve).catch(reject);
          return;
        }
      } catch (e) {
        /* fallback */
      }
    }
    if (typeof wx.canvasToTempFilePath !== 'function') {
      reject(compressError('COMPRESS_NO_CANVAS', '当前环境无法离屏重编码'));
      return;
    }
    const opts = {
      canvas,
      fileType: type,
      success(res) {
        resolve(res.tempFilePath);
      },
      fail() {
        reject(compressError('COMPRESS_ENCODE_FAILED', '画布导出失败'));
      }
    };
    if (type !== 'png') opts.quality = q;
    wx.canvasToTempFilePath(opts);
  });
}

function drawSource(imagePath, outW, outH) {
  return getImageInfo(imagePath).then((info) => {
    const w = Math.max(2, Math.round(outW || info.width || 2));
    const h = Math.max(2, Math.round(outH || info.height || 2));
    const canvas = createCanvas(w, h);
    if (!canvas) {
      return Promise.reject(compressError('COMPRESS_NO_CANVAS', '当前环境无法离屏重编码'));
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return Promise.reject(compressError('COMPRESS_NO_CANVAS', '当前环境无法离屏重编码'));
    }
    return loadImage(canvas, imagePath).then((img) => {
      ctx.drawImage(img, 0, 0, w, h);
      return { canvas, width: w, height: h, sourceWidth: info.width, sourceHeight: info.height };
    });
  });
}

function encodeDrawn(canvas, fileType, quality) {
  return exportCanvas(canvas, fileType, quality).then((filePath) =>
    getFileBytes(filePath).then((bytes) => ({
      filePath,
      bytes,
      kb: bytesToKb(bytes),
      quality: fileType === 'png' ? null : quality,
      format: fileType === 'png' ? 'png' : 'jpeg'
    }))
  );
}

function reportOriginal(imagePath, targetKb, extra) {
  return getFileBytes(imagePath)
    .catch(() => 0)
    .then((bytes) => ({
      filePath: imagePath,
      bytes,
      kb: bytesToKb(bytes),
      quality: null,
      format: 'original',
      width: extra && extra.width,
      height: extra && extra.height,
      targetKb: targetKb || 0,
      metTarget: !targetKb || bytesToKb(bytes) <= targetKb,
      bestEffort: true,
      keptAlpha: !!(extra && extra.keptAlpha),
      message: (extra && extra.message) || '无法重编码，已按原文件体积统计'
    }));
}

function compressToTarget(payload) {
  const imagePath = payload && payload.imagePath;
  if (!imagePath) {
    return Promise.reject(compressError('COMPRESS_NO_IMAGE', '没有可压缩的照片'));
  }
  const targetKb = parseTargetKb(payload.targetKb);
  const needAlpha = shouldKeepPng(payload);
  const outW = payload.outWidth || (payload.spec && payload.spec.width) || 0;
  const outH = payload.outHeight || (payload.spec && payload.spec.height) || 0;

  return drawSource(imagePath, outW, outH)
    .then((drawn) => {
      if (needAlpha) {
        return encodeDrawn(drawn.canvas, 'png').then((encoded) =>
          Object.assign({}, encoded, {
            width: drawn.width,
            height: drawn.height,
            targetKb,
            metTarget: !targetKb || encoded.kb <= targetKb,
            bestEffort: !!(targetKb && encoded.kb > targetKb),
            keptAlpha: true,
            message:
              targetKb && encoded.kb > targetKb
                ? `透明底保留 PNG，实际 ${formatKb(encoded.kb)}，无法用 JPEG 质量压到 ${formatKb(targetKb)}`
                : '透明底保留 PNG'
          })
        );
      }

      const measure = (quality) => encodeDrawn(drawn.canvas, 'jpg', quality);
      const targetBytes = targetKb ? kbToBytes(targetKb) : 0;
      if (!targetKb) {
        return measure(MAX_QUALITY).then((encoded) =>
          Object.assign({}, encoded, {
            width: drawn.width,
            height: drawn.height,
            targetKb: 0,
            metTarget: true,
            bestEffort: false,
            keptAlpha: false,
            message: `JPEG 质量 ${qualityPercent(encoded.quality)}`
          })
        );
      }

      return searchQuality(targetBytes, measure, {
        minQuality: MIN_QUALITY,
        maxQuality: MAX_QUALITY
      }).then((search) => {
        const encoded = search.result;
        return Object.assign({}, encoded, {
          kb: bytesToKb(encoded.bytes),
          width: drawn.width,
          height: drawn.height,
          targetKb,
          metTarget: search.metTarget,
          bestEffort: !!search.bestEffort,
          keptAlpha: false,
          attempts: (search.attempts || []).length,
          message: search.metTarget
            ? `JPEG 质量 ${qualityPercent(encoded.quality)}，${formatKb(bytesToKb(encoded.bytes))} ≤ ${formatKb(targetKb)}`
            : `已用最低可用质量，实际 ${formatKb(bytesToKb(encoded.bytes))}，未压到 ${formatKb(targetKb)}`
        });
      });
    })
    .catch((err) => {
      if (err && err.code === 'COMPRESS_NO_CANVAS') {
        return reportOriginal(imagePath, targetKb, {
          keptAlpha: needAlpha,
          message: needAlpha
            ? '透明底且无法重编码，已按原文件体积统计'
            : '当前环境无法离屏重编码，已按原文件体积统计'
        });
      }
      return Promise.reject(err);
    });
}

function measureImage(imagePath) {
  if (!imagePath) {
    return Promise.resolve({ bytes: 0, kb: 0, width: 0, height: 0 });
  }
  return Promise.all([
    getFileBytes(imagePath).catch(() => 0),
    getImageInfo(imagePath).catch(() => ({ width: 0, height: 0 }))
  ]).then(([bytes, info]) => ({
    bytes,
    kb: bytesToKb(bytes),
    width: info.width || 0,
    height: info.height || 0
  }));
}

module.exports = {
  compressToTarget,
  measureImage,
  getFileBytes,
  bytesToKb,
  formatKb,
  parseTargetKb,
  shouldKeepPng,
  qualityPercent
};
