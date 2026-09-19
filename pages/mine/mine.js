const { toast } = require('../../utils/system');

Page({
  onVip() {
    toast('会员能力为占位，尚未接入支付');
  },

  onWorks() {
    wx.navigateTo({ url: '/pages/works/works' });
  },

  onDrafts() {
    wx.navigateTo({ url: '/pages/drafts/drafts' });
  },

  onSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  onPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  }
});
