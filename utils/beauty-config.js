const fileConfig = require('../config');
const storage = require('./storage');
const { getMattingConfig, trimSlash } = require('./matting-config');
const { MODE_BEAUTY, MODE_COMPLIANCE, normalizeMode } = require('../constants/beauty');

function getBeautyConfig() {
  const settings = storage.getSettings();
  const file = (fileConfig && fileConfig.beauty) || {};
  const matting = getMattingConfig();
  const provider = settings.beautyProvider || file.provider || 'auto';
  const baseUrl = trimSlash(settings.beautyBaseUrl || file.baseUrl || matting.baseUrl || '');
  return {
    provider,
    baseUrl,
    path: file.path || '/beautify',
    timeoutMs: file.timeoutMs || matting.timeoutMs || 60000,
    enableLocalFallback: file.enableLocalFallback !== false,
    autoBeautyIdPhoto: settings.autoBeautyIdPhoto === true,
    defaultMode: normalizeMode(settings.beautyMode || file.defaultMode || MODE_BEAUTY)
  };
}

function hasRemoteBeauty(cfg) {
  const c = cfg || getBeautyConfig();
  return !!c.baseUrl;
}

function defaultEditorMode(hasSpec) {
  if (hasSpec) return MODE_COMPLIANCE;
  return getBeautyConfig().defaultMode || MODE_BEAUTY;
}

module.exports = {
  getBeautyConfig,
  hasRemoteBeauty,
  defaultEditorMode,
  MODE_BEAUTY,
  MODE_COMPLIANCE
};
