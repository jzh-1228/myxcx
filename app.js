const storage = require('./utils/storage');

App({
  globalData: {
    brand: '最美证件照',
    tagline: '全能修图'
  },

  onLaunch() {
    storage.ensureSeedDrafts();
  },

  onShow() {},

  onHide() {}
});
