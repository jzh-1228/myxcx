const storage = require('../../utils/storage');
const { formatDraftTime } = require('../../utils/format');

Page({
  data: {
    works: []
  },

  onShow() {
    this.setData({
      works: storage.listWorks().map((item) =>
        Object.assign({}, item, { timeText: formatDraftTime(item.createdAt) })
      )
    });
  }
});
