const { getMattingConfig } = require('../../utils/matting-config');
const { writeBase64Image } = require('../../utils/file');
const { normalizeHex } = require('../../constants/matting');
const { notConfigured } = require('./errors');
const { joinUrl, postFile } = require('./http');

function requireConfig() {
  const cfg = getMattingConfig();
  if (!cfg.baseUrl) {
    throw notConfigured('hivision');
  }
  return cfg;
}

function mattingModel(cfg) {
  return (cfg.hivision && cfg.hivision.mattingModel) || 'modnet_photographic_portrait_matting';
}

function matte(payload) {
  let cfg;
  try {
    cfg = requireConfig();
  } catch (e) {
    return Promise.reject(e);
  }
  const imagePath = payload && payload.imagePath;
  if (!imagePath) {
    return Promise.reject({ code: 'MATTING_NO_IMAGE', message: '没有可抠图的照片' });
  }
  return postFile(joinUrl(cfg.baseUrl, '/human_matting'), imagePath, {
    human_matting_model: mattingModel(cfg),
    dpi: '300'
  }).then((data) =>
    writeBase64Image(data._imageBase64, 'png').then((mattePath) => ({
      mattePath,
      imagePath: mattePath
    }))
  );
}

function addBackground(payload) {
  let cfg;
  try {
    cfg = requireConfig();
  } catch (e) {
    return Promise.reject(e);
  }
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
  return postFile(joinUrl(cfg.baseUrl, '/add_background'), mattePath, {
    color,
    render: '0',
    dpi: '300'
  }).then((data) =>
    writeBase64Image(data._imageBase64, 'jpg').then((imagePath) => ({
      imagePath,
      colorHex: color
    }))
  );
}

function idPhoto(payload) {
  let cfg;
  try {
    cfg = requireConfig();
  } catch (e) {
    return Promise.reject(e);
  }
  const imagePath = payload && payload.imagePath;
  if (!imagePath) {
    return Promise.reject({ code: 'MATTING_NO_IMAGE', message: '没有可制作证件照的照片' });
  }
  return postFile(joinUrl(cfg.baseUrl, '/idphoto'), imagePath, {
    width: String((payload && payload.width) || 295),
    height: String((payload && payload.height) || 413),
    hd: 'true',
    human_matting_model: mattingModel(cfg),
    face_detect_model: 'mtcnn',
    dpi: '300'
  }).then((data) =>
    writeBase64Image(data._imageBase64, 'png').then((mattePath) => ({
      mattePath,
      imagePath: mattePath
    }))
  );
}

module.exports = {
  id: 'hivision',
  matte,
  addBackground,
  idPhoto
};
