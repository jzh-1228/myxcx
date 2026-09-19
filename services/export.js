const storage = require('../utils/storage');

function saveToAlbum(filePath) {
  if (!filePath) {
    return Promise.reject({ code: 'NO_IMAGE', message: '没有可保存的图片' });
  }
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success(res) {
        resolve(res);
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

function exportHd() {
  return Promise.reject({
    code: 'HD_STUB',
    message: '高清导出为桩，尚未接入超分'
  });
}

function shareStub() {
  return Promise.reject({
    code: 'SHARE_STUB',
    message: '分享为桩'
  });
}

function recordWork(partial) {
  return storage.saveWork(partial);
}

module.exports = {
  saveToAlbum,
  exportHd,
  shareStub,
  recordWork
};
