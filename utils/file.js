const { stripDataUrl } = require('../services/matting/parse');

function writeBase64Image(base64, ext) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    const suffix = ext || 'png';
    const filePath = `${wx.env.USER_DATA_PATH}/zm-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)}.${suffix}`;
    fs.writeFile({
      filePath,
      data: stripDataUrl(base64),
      encoding: 'base64',
      success() {
        resolve(filePath);
      },
      fail(err) {
        reject({
          code: 'FILE_WRITE_FAILED',
          message: '无法保存抠图结果到本地',
          cause: err
        });
      }
    });
  });
}

function readFileBase64(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success(res) {
        resolve(res.data);
      },
      fail(err) {
        reject({
          code: 'FILE_READ_FAILED',
          message: '无法读取本地图片',
          cause: err
        });
      }
    });
  });
}

module.exports = {
  writeBase64Image,
  readFileBase64
};
