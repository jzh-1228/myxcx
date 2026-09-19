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

function getFileBytes(filePath) {
  return new Promise((resolve, reject) => {
    const fail = (err) => {
      reject({
        code: 'FILE_INFO_FAILED',
        message: '无法读取文件大小',
        cause: err
      });
    };
    if (!filePath) {
      fail({ message: 'empty path' });
      return;
    }
    function fromBuffer() {
      wx.getFileSystemManager().readFile({
        filePath,
        success(res) {
          const data = res.data;
          if (data && typeof data.byteLength === 'number') {
            resolve(data.byteLength);
            return;
          }
          if (typeof data === 'string') {
            const padding = data.slice(-2) === '==' ? 2 : data.slice(-1) === '=' ? 1 : 0;
            resolve(Math.max(0, Math.floor((data.length * 3) / 4) - padding));
            return;
          }
          fail({ message: 'unknown data' });
        },
        fail
      });
    }
    if (typeof wx.getFileInfo === 'function') {
      wx.getFileInfo({
        filePath,
        success(res) {
          resolve(Number(res.size) || 0);
        },
        fail() {
          fromBuffer();
        }
      });
      return;
    }
    fromBuffer();
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
  readFileBase64,
  getFileBytes
};
