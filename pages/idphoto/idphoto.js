const { ID_SPECS } = require('../../constants/specs');
const { openEditor } = require('../../utils/navigate');
const media = require('../../services/media');
function filterSpecs(keyword) {
  const q = (keyword || '').trim();
  if (!q) return ID_SPECS;
  return ID_SPECS.filter((item) => {
    const blob = `${item.name}${item.sizeText}${item.id}`;
    return blob.indexOf(q) >= 0;
  });
}

Page({
  data: {
    keyword: '',
    filtered: ID_SPECS
  },

  onSearch(e) {
    const keyword = e.detail.value || '';
    this.setData({
      keyword,
      filtered: filterSpecs(keyword)
    });
  },

  onSpec(e) {
    const id = e.currentTarget.dataset.id;
    const spec = ID_SPECS.find((item) => item.id === id);
    if (!spec) return;

    const enter = () => {
      media.chooseAndOpen(
        (payload) => {
          openEditor({
            imagePath: payload.imagePath,
            mode: 'portrait',
            sub: 'skin',
            spec
          });
        },
        { sourceType: ['album', 'camera'] }
      );
    };

    if (spec.id === 'visa') {
      wx.showActionSheet({
        itemList: ['美国签证（桩）', '日本签证（桩）', '通用签证规格'],
        success() {
          enter();
        },
        fail() {}
      });
      return;
    }

    enter();
  },

  onShow() {
    this.setData({ filtered: filterSpecs(this.data.keyword) });
  }
});
