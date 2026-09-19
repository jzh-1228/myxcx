const storage = require('../../utils/storage');
const { formatDraftTime } = require('../../utils/format');
const { openEditor } = require('../../utils/navigate');

function mapDrafts() {
  return storage.listDrafts().map((item) => {
    const specName = item.specContext && item.specContext.name;
    return Object.assign({}, item, {
      timeText: formatDraftTime(item.updatedAt),
      title: specName ? `证件照 · ${specName}` : item.seeded ? '示例草稿' : '修图草稿'
    });
  });
}

Page({
  data: {
    drafts: []
  },

  onShow() {
    this.setData({ drafts: mapDrafts() });
  },

  onOpen(e) {
    const id = e.currentTarget.dataset.id;
    const draft = storage.getDraft(id);
    if (!draft) return;
    openEditor({
      imagePath: draft.imagePath || '',
      mode: draft.mode || 'portrait',
      sub: draft.sub || 'skin',
      spec: draft.specContext || null,
      draftId: draft.id,
      persistDraft: false
    });
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除草稿',
      content: '仅删除本地草稿记录',
      success: (res) => {
        if (!res.confirm) return;
        storage.removeDraft(id);
        this.setData({ drafts: mapDrafts() });
      }
    });
  }
});
