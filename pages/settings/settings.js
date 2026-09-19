const storage = require('../../utils/storage');

const QUALITY_MAP = {
  standard: '标准',
  hd: '高清（桩）'
};

Page({
  data: {
    quality: 'standard',
    qualityText: '标准'
  },

  onShow() {
    const settings = storage.getSettings();
    const quality = settings.exportQuality || 'standard';
    this.setData({
      quality,
      qualityText: QUALITY_MAP[quality] || '标准'
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
  }
});
