function mattingError(code, message, extra) {
  return Object.assign({ code, message }, extra || {});
}

function notConfigured(provider) {
  return mattingError(
    'MATTING_NOT_CONFIGURED',
    '未配置抠图服务。请到「我的 → 设置」填写服务地址，或在项目根目录 config.js 设置 matting.baseUrl。开发者工具请勾选「不校验合法域名、web-view、TLS」；正式版须把该 HTTPS 域名加入 request 与 uploadFile 合法域名。',
    { provider: provider || 'hivision' }
  );
}

function networkError(err) {
  const msg = (err && (err.errMsg || err.message)) || '';
  if (msg.indexOf('url not in domain') !== -1 || msg.indexOf('合法域名') !== -1) {
    return mattingError(
      'MATTING_DOMAIN',
      '域名未在小程序后台配置。开发者工具可勾选「不校验合法域名」；正式版请添加 request / uploadFile 合法域名。'
    );
  }
  return mattingError('MATTING_NETWORK', msg ? `无法连接抠图服务：${msg}` : '无法连接抠图服务');
}

function failed(message) {
  return mattingError('MATTING_FAILED', message || '抠图失败');
}

function badResponse() {
  return mattingError('MATTING_BAD_RESPONSE', '抠图服务返回无法解析');
}

function formatError(err) {
  if (!err) return '抠图失败';
  return err.message || err.errMsg || '抠图失败';
}

module.exports = {
  mattingError,
  notConfigured,
  networkError,
  failed,
  badResponse,
  formatError
};
