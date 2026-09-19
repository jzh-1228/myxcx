const { CREATE_FEATURES, HOT_TEMPLATES } = require('../../constants/create');
const { openEditor } = require('../../utils/navigate');
const media = require('../../services/media');
const ai = require('../../services/ai');
const { toast } = require('../../utils/system');

Page({
  data: {
    features: CREATE_FEATURES,
    templates: HOT_TEMPLATES
  },

  onFeature(e) {
    const id = e.currentTarget.dataset.id;
    const item = CREATE_FEATURES.find((f) => f.id === id);
    if (!item) return;
    this.enterEditor(item.mode, item.capability);
  },

  onTemplate() {
    this.enterEditor('create', 'template');
  },

  enterEditor(mode, sub) {
    media.chooseAndOpen(
      (payload) => {
        if (mode === 'ai' && sub) {
          ai.toastStub(sub);
        }
        openEditor({
          imagePath: payload.imagePath,
          mode,
          sub: sub || ''
        });
      },
      { sourceType: ['album', 'camera'] }
    ).then((mediaFile) => {
      if (!mediaFile && mode === 'ai') {
        toast('请先选图，再使用 AI 入口');
      }
    });
  }
});
