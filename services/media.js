function chooseImage(options) {
  const { sourceType, count } = options || {};
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: count || 1,
      mediaType: ['image'],
      sourceType: sourceType || ['album', 'camera'],
      success(res) {
        const file = (res.tempFiles && res.tempFiles[0]) || null;
        if (!file) {
          reject({ errMsg: 'chooseMedia:empty' });
          return;
        }
        resolve({
          path: file.tempFilePath,
          size: file.size,
          width: file.width,
          height: file.height
        });
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

function chooseAndOpen(openFn, options) {
  return chooseImage(options)
    .then((media) => {
      openFn(Object.assign({}, options, { imagePath: media.path }));
      return media;
    })
    .catch((err) => {
      const msg = (err && err.errMsg) || '';
      if (msg.indexOf('cancel') !== -1) return null;
      wx.showToast({ title: '选图失败', icon: 'none' });
      return null;
    });
}

module.exports = {
  chooseImage,
  chooseAndOpen
};
