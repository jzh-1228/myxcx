const storage = require('../../utils/storage');
const { PROVIDERS } = require('../../constants/matting');
const { toast } = require('../../utils/system');
const { getMattingConfig } = require('../../utils/matting-config');

const QUALITY_MAP = {
  standard: '标准',
  hd: '高清（桩）'
};

function providerLabel(id) {
  const found = PROVIDERS.find((item) => item.id === id);
  return found ? found.name : 'Hivision（自托管）';
}

Page({
  data: {
    quality: 'standard',
    qualityText: '标准',
    provider: 'hivision',
    providerText: 'Hivision（自托管）',
    mattingBaseUrl: '',
    mattingWebhookUrl: '',
    autoMatteIdPhoto: true,
    autoMatteText: '开'
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const settings = storage.getSettings();
    const cfg = getMattingConfig();
    const quality = settings.exportQuality || 'standard';
    const provider = cfg.provider || 'hivision';
    this.setData({
      quality,
      qualityText: QUALITY_MAP[quality] || '标准',
      provider,
      providerText: providerLabel(provider),
      mattingBaseUrl: cfg.baseUrl,
      mattingWebhookUrl: (cfg.webhook && cfg.webhook.url) || '',
      autoMatteIdPhoto: cfg.autoMatteIdPhoto !== false,
      autoMatteText: cfg.autoMatteIdPhoto === false ? '关' : '开'
    });
  },

  onQuality() {
    wx.showActionSheet({
      itemList: ['标准', '高清（桩）'],
      success: (res) => {
        const quality = res.tapIndex === 1 ? 'hd' : 'standard';
        storage.saveSettings({ exportQuality: quality });
        this.setData({
          quality,
          qualityText: QUALITY_MAP[quality]
        });
      }
    });
  },

  onProvider() {
    wx.showActionSheet({
      itemList: PROVIDERS.map((item) => item.name),
      success: (res) => {
        const item = PROVIDERS[res.tapIndex];
        if (!item) return;
        this.setData({
          provider: item.id,
          providerText: item.name
        });
      }
    });
  },

  onBaseUrl(e) {
    this.setData({ mattingBaseUrl: (e.detail.value || '').trim() });
  },

  onWebhookUrl(e) {
    this.setData({ mattingWebhookUrl: (e.detail.value || '').trim() });
  },

  onToggleAuto() {
    const next = !this.data.autoMatteIdPhoto;
    this.setData({
      autoMatteIdPhoto: next,
      autoMatteText: next ? '开' : '关'
    });
  },

  onSaveMatting() {
    storage.saveSettings({
      mattingProvider: this.data.provider,
      mattingBaseUrl: this.data.mattingBaseUrl,
      mattingWebhookUrl: this.data.mattingWebhookUrl,
      autoMatteIdPhoto: this.data.autoMatteIdPhoto
    });
    toast('已保存抠图配置', 'success');
  }
});
