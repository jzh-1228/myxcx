function beautyError(code, message, extra) {
  return Object.assign({ code, message }, extra || {});
}

function notConfigured() {
  return beautyError(
    'BEAUTY_NOT_CONFIGURED',
    '云端美颜未配置，且本地轻处理不可用。可到「设置」填写与抠图相同的 Hivision baseUrl（将尝试 /beautify），或升级微信基础库以启用离屏画布。'
  );
}

function localUnavailable() {
  return beautyError(
    'BEAUTY_LOCAL_UNAVAILABLE',
    '当前环境无法做本地轻处理（需要离屏 Canvas 2D）。请升级微信，或配置 beauty.baseUrl / 与抠图相同的 Hivision 地址并提供 /beautify。'
  );
}

function remoteMissing() {
  return beautyError(
    'BEAUTY_REMOTE_MISSING',
    '服务没有 /beautify（Hivision 原版只有证件照美白参数）。将尝试本地轻处理。'
  );
}

function formatError(err) {
  if (!err) return '美颜失败';
  return err.message || err.errMsg || '美颜失败';
}

function showError(err) {
  const msg = formatError(err);
  const code = err && err.code;
  if (
    code === 'BEAUTY_NOT_CONFIGURED' ||
    code === 'BEAUTY_LOCAL_UNAVAILABLE' ||
    code === 'BEAUTY_DOMAIN' ||
    msg.length > 22
  ) {
    wx.showModal({
      title: '无法美颜',
      content: msg,
      showCancel: false
    });
    return;
  }
  wx.showToast({ title: msg, icon: 'none', duration: 2200 });
}

module.exports = {
  beautyError,
  notConfigured,
  localUnavailable,
  remoteMissing,
  formatError,
  showError
};
