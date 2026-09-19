function getStatusBarHeight() {
  try {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    return info.statusBarHeight || 20;
  } catch (e) {
    return 20;
  }
}

function toast(title, icon) {
  wx.showToast({
    title: title || '',
    icon: icon || 'none',
    duration: 2000
  });
}

module.exports = {
  getStatusBarHeight,
  toast
};
