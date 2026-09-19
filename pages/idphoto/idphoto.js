const { ID_SPECS } = require('../../constants/specs');
const { nameToHex } = require('../../constants/matting');
const { openEditor } = require('../../utils/navigate');
const { isConfigured, getMattingConfig } = require('../../utils/matting-config');
const { toast } = require('../../utils/system');
const media = require('../../services/media');
const matting = require('../../services/matting');

function filterSpecs(keyword) {
  const q = (keyword || '').trim();
  if (!q) return ID_SPECS;
  return ID_SPECS.filter((item) => {
    const blob = `${item.name}${item.sizeText}${item.id}`;
    return blob.indexOf(q) >= 0;
  });
}

function enterEditor(spec, file, extra) {
  openEditor(
    Object.assign(
      {
        imagePath: file.path,
        sourcePath: file.path,
        mode: 'portrait',
        sub: 'skin',
        spec
      },
      extra || {}
    )
  );
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

    const enter = () => this.pickAndCompose(spec);

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

  pickAndCompose(spec) {
    media
      .chooseImage({ sourceType: ['album', 'camera'] })
      .then((file) => {
        const cfg = getMattingConfig();
        if (!cfg.autoMatteIdPhoto) {
          enterEditor(spec, file);
          return;
        }
        if (!isConfigured(cfg)) {
          wx.showModal({
            title: '未配置抠图服务',
            content: '已进入编辑器，画布为原图。请到「我的 → 设置」填写 matting.baseUrl，或编辑项目根目录 config.js。',
            showCancel: false
          });
          enterEditor(spec, file);
          return;
        }
        wx.showLoading({ title: '抠图换底中', mask: true });
        let colorHex = 'FFFFFF';
        try {
          colorHex = nameToHex(spec.bgColor);
        } catch (e) {
          colorHex = 'FFFFFF';
        }
        return matting
          .composeIdPhoto({
            imagePath: file.path,
            width: spec.width,
            height: spec.height,
            colorHex
          })
          .then((result) => {
            wx.hideLoading();
            enterEditor(spec, file, {
              imagePath: result.imagePath,
              sourcePath: result.sourcePath,
              mattePath: result.mattePath,
              bgHex: result.colorHex
            });
          })
          .catch((err) => {
            wx.hideLoading();
            matting.showError(err);
            enterEditor(spec, file);
          });
      })
      .catch((err) => {
        const msg = (err && err.errMsg) || '';
        if (msg.indexOf('cancel') !== -1) return;
        toast('选图失败');
      });
  },

  onShow() {
    this.setData({ filtered: filterSpecs(this.data.keyword) });
  }
});
