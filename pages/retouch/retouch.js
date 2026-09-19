const { SHORTCUTS } = require('../../constants/editor');
const storage = require('../../utils/storage');
const { formatDraftTime } = require('../../utils/format');
const { openEditor } = require('../../utils/navigate');
const media = require('../../services/media');

function mapDrafts() {
  return storage.listDrafts().slice(0, 8).map((item) =>
    Object.assign({}, item, { timeText: formatDraftTime(item.updatedAt) })
  );
}

Page({
  data: {
    drafts: [],
    shortcuts: SHORTCUTS
  },

  onShow() {
    this.setData({ drafts: mapDrafts() });
  },

  onAlbum() {
    this.pickAndOpen({ sourceType: ['album'], mode: 'portrait', sub: 'skin' });
  },

  onCamera() {
    this.pickAndOpen({ sourceType: ['camera'], mode: 'portrait', sub: 'skin' });
  },

  onDraft(e) {
    const id = e.currentTarget.dataset.id;
    const draft = storage.getDraft(id);
    if (!draft) return;
    openEditor({
      imagePath: draft.imagePath || '',
      sourcePath: draft.sourcePath || draft.imagePath || '',
      mattePath: draft.mattePath || '',
      bgHex: draft.bgHex || '',
      mode: draft.mode || 'portrait',
      sub: draft.sub || 'skin',
      spec: draft.specContext || null,
      draftId: draft.id,
      persistDraft: false
    });
  },

  onMoreDrafts() {
    wx.navigateTo({ url: '/pages/drafts/drafts' });
  },

  onShortcut(e) {
    const id = e.currentTarget.dataset.id;
    const item = SHORTCUTS.find((s) => s.id === id);
    if (!item) return;
    this.pickAndOpen({
      sourceType: ['album', 'camera'],
      mode: item.mode,
      sub: item.sub
    });
  },

  pickAndOpen(options) {
    media.chooseAndOpen(
      (payload) => {
        openEditor({
          imagePath: payload.imagePath,
          sourcePath: payload.imagePath,
          mode: options.mode,
          sub: options.sub,
          autoMatte: options.sub === 'matting'
        });
      },
      { sourceType: options.sourceType }
    );
  }
});
