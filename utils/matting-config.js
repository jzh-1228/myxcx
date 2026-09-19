const fileConfig = require('../config');
const storage = require('./storage');

function trimSlash(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function getMattingConfig() {
  const settings = storage.getSettings();
  const file = (fileConfig && fileConfig.matting) || {};
  const webhookFile = file.webhook || {};
  const provider = settings.mattingProvider || file.provider || 'hivision';
  return {
    provider,
    baseUrl: trimSlash(settings.mattingBaseUrl || file.baseUrl || ''),
    timeoutMs: file.timeoutMs || 60000,
    hivision: file.hivision || {},
    aliyun: file.aliyun || {},
    webhook: {
      url: trimSlash(settings.mattingWebhookUrl || webhookFile.url || ''),
      token: webhookFile.token || ''
    },
    autoMatteIdPhoto: settings.autoMatteIdPhoto !== false
  };
}

function isConfigured(cfg) {
  const c = cfg || getMattingConfig();
  if (c.provider === 'hivision') return !!c.baseUrl;
  if (c.provider === 'webhook') return !!(c.webhook && c.webhook.url);
  return false;
}

module.exports = {
  trimSlash,
  getMattingConfig,
  isConfigured
};
