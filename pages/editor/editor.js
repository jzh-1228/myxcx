const {
  EDITOR_MODES,
  PORTRAIT_CHIPS,
  FILTERS,
  EDIT_TOOLS,
  ADJUST_SLIDERS,
  CREATE_TOOLS,
  CREATE_TEMPLATES,
  AI_CAPABILITIES,
  BG_COLORS
} = require('../../constants/editor');
const { findSpec, displaySpecName } = require('../../constants/specs');
const storage = require('../../utils/storage');
const { getStatusBarHeight, toast } = require('../../utils/system');
const ai = require('../../services/ai');
const exportService = require('../../services/export');

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function findChip(id) {
  return PORTRAIT_CHIPS.find((item) => item.id === id) || PORTRAIT_CHIPS[0];
}

function canvasHint(mode, spec) {
  if (spec) return '证件照画布 · 规格约束中';
  const map = {
    portrait: '人像画布',
    filter: '滤镜效果预览',
    edit: '通用编辑画布',
    create: '创作图层预览',
    ai: 'AI 效果预览'
  };
  return map[mode] || '预览图';
}

Page({
  data: {
    statusBarHeight: 20,
    imagePath: '',
    draftId: '',
    mode: 'portrait',
    modes: EDITOR_MODES,
    specContext: null,
    specCollapsed: false,
    comparing: false,
    showExport: false,
    canvasHint: '人像画布',
    portraitChips: PORTRAIT_CHIPS,
    portraitSub: 'skin',
    portraitTitle: '美肤',
    portraitSliders: clone(PORTRAIT_CHIPS[0].sliders),
    filters: FILTERS,
    filterId: 'none',
    filterStrength: 70,
    editTools: EDIT_TOOLS,
    editTool: '',
    adjustSliders: clone(ADJUST_SLIDERS),
    createTools: CREATE_TOOLS,
    createTool: 'template',
    createTemplates: CREATE_TEMPLATES,
    aiCaps: AI_CAPABILITIES,
    aiCap: '',
    history: [],
    historyIndex: -1
  },

  onLoad(query) {
    const imagePath = query.image ? decodeURIComponent(query.image) : '';
    const mode = query.mode || 'portrait';
    const sub = query.sub || '';
    const draftId = query.draftId || '';
    let specContext = null;

    if (query.specId) {
      const found = findSpec(query.specId);
      specContext = {
        id: query.specId,
        name: query.specName ? decodeURIComponent(query.specName) : (found && found.name) || '规格',
        width: Number(query.canvasW) || (found && found.width) || 0,
        height: Number(query.canvasH) || (found && found.height) || 0,
        bgColor: query.bg ? decodeURIComponent(query.bg) : (found && found.bgColor) || '白',
        sizeText: found && found.sizeText ? found.sizeText : `${query.canvasW || ''}×${query.canvasH || ''}`
      };
    }

    const next = {
      statusBarHeight: getStatusBarHeight(),
      imagePath,
      draftId,
      mode,
      specContext,
      canvasHint: canvasHint(mode, specContext)
    };

    if (mode === 'portrait') {
      const chip = findChip(sub || 'skin');
      next.portraitSub = chip.id;
      next.portraitTitle = chip.name;
      next.portraitSliders = clone(chip.sliders);
    } else if (mode === 'filter') {
      next.filterId = sub || 'none';
    } else if (mode === 'edit') {
      next.editTool = sub || '';
    } else if (mode === 'create') {
      next.createTool = sub || 'template';
    } else if (mode === 'ai') {
      next.aiCap = sub || '';
    }

    this.setData(next, () => {
      this.pushHistory();
    });
  },

  pickState() {
    const d = this.data;
    return {
      mode: d.mode,
      portraitSub: d.portraitSub,
      portraitSliders: d.portraitSliders,
      filterId: d.filterId,
      filterStrength: d.filterStrength,
      editTool: d.editTool,
      adjustSliders: d.adjustSliders,
      createTool: d.createTool,
      aiCap: d.aiCap,
      specContext: d.specContext
    };
  },

  applyState(state) {
    const chip = findChip(state.portraitSub);
    this.setData({
      mode: state.mode,
      portraitSub: state.portraitSub,
      portraitTitle: chip.name,
      portraitSliders: clone(state.portraitSliders),
      filterId: state.filterId,
      filterStrength: state.filterStrength,
      editTool: state.editTool,
      adjustSliders: clone(state.adjustSliders),
      createTool: state.createTool,
      aiCap: state.aiCap,
      specContext: state.specContext,
      canvasHint: canvasHint(state.mode, state.specContext)
    });
  },

  pushHistory() {
    const snap = JSON.stringify(this.pickState());
    const history = this.data.history.slice(0, this.data.historyIndex + 1);
    if (history[history.length - 1] === snap) return;
    history.push(snap);
    this.setData({
      history: history.slice(-30),
      historyIndex: Math.min(history.length - 1, 29)
    });
    this.persistDraft();
  },

  persistDraft() {
    if (!this.data.draftId && !this.data.imagePath) return;
    storage.saveDraft({
      id: this.data.draftId || undefined,
      imagePath: this.data.imagePath,
      mode: this.data.mode,
      sub: this.currentSub(),
      specContext: this.data.specContext
    });
  },

  currentSub() {
    const d = this.data;
    if (d.mode === 'portrait') return d.portraitSub;
    if (d.mode === 'filter') return d.filterId;
    if (d.mode === 'edit') return d.editTool;
    if (d.mode === 'create') return d.createTool;
    if (d.mode === 'ai') return d.aiCap;
    return '';
  },

  onClose() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.switchTab({
      url: this.data.specContext ? '/pages/idphoto/idphoto' : '/pages/retouch/retouch'
    });
  },

  onCompare() {
    const comparing = !this.data.comparing;
    this.setData({ comparing });
    if (comparing) {
      toast('对比为桩：尚未接入原图分层');
    }
  },

  onUndo() {
    if (this.data.historyIndex <= 0) {
      toast('没有可撤销的操作');
      return;
    }
    const historyIndex = this.data.historyIndex - 1;
    this.setData({ historyIndex });
    this.applyState(JSON.parse(this.data.history[historyIndex]));
  },

  onRedo() {
    if (this.data.historyIndex >= this.data.history.length - 1) {
      toast('没有可重做的操作');
      return;
    }
    const historyIndex = this.data.historyIndex + 1;
    this.setData({ historyIndex });
    this.applyState(JSON.parse(this.data.history[historyIndex]));
  },

  onExport() {
    this.setData({ showExport: true });
  },

  onCloseExport() {
    this.setData({ showExport: false });
  },

  onMode(e) {
    const mode = e.currentTarget.dataset.id;
    this.setData({
      mode,
      canvasHint: canvasHint(mode, this.data.specContext)
    });
    this.pushHistory();
  },

  onPortraitChip(e) {
    const id = e.currentTarget.dataset.id;
    const chip = findChip(id);
    this.setData({
      portraitSub: chip.id,
      portraitTitle: chip.name,
      portraitSliders: clone(chip.sliders)
    });
    this.pushHistory();
  },

  onSliderChange(e) {
    const { key, value, live } = e.detail;
    if (key === 'filterStrength') {
      this.setData({ filterStrength: value });
    } else if (this.data.mode === 'portrait') {
      const portraitSliders = this.data.portraitSliders.map((item) =>
        item.key === key ? Object.assign({}, item, { value }) : item
      );
      this.setData({ portraitSliders });
    } else if (this.data.mode === 'edit') {
      const adjustSliders = this.data.adjustSliders.map((item) =>
        item.key === key ? Object.assign({}, item, { value }) : item
      );
      this.setData({ adjustSliders });
    }
    if (!live) this.pushHistory();
  },

  onFilter(e) {
    this.setData({ filterId: e.currentTarget.dataset.id });
    this.pushHistory();
    toast('滤镜为视觉桩，未套用真实 LUT');
  },

  onEditTool(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ editTool: id });
    this.pushHistory();
    if (id !== 'adjust') {
      toast(`编辑桩：${id}，算法未接入`);
    }
  },

  onCreateTool(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ createTool: id });
    this.pushHistory();
    if (id !== 'template') {
      toast(`创作桩：${id}`);
    }
  },

  onCreateTemplate(e) {
    toast(`已选择模板桩：${e.currentTarget.dataset.id}`);
  },

  onAiCap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ aiCap: id });
    this.pushHistory();
    const cap = AI_CAPABILITIES.find((item) => item.id === id);
    const fn = ai[id];
    if (typeof fn === 'function') {
      fn({ imagePath: this.data.imagePath }).catch(() => {
        ai.toastStub(id, cap && cap.name);
      });
    } else {
      ai.toastStub(id, cap && cap.name);
    }
  },

  onToggleSpec() {
    this.setData({ specCollapsed: !this.data.specCollapsed });
  },

  onSpecColor() {
    wx.showActionSheet({
      itemList: BG_COLORS.map((c) => `${c}底`),
      success: (res) => {
        const bgColor = BG_COLORS[res.tapIndex];
        const specContext = Object.assign({}, this.data.specContext, { bgColor });
        this.setData({ specContext });
        this.pushHistory();
      }
    });
  },

  onSpecKb() {
    const spec = this.data.specContext;
    toast(spec ? `KB 检测桩：${spec.sizeText}` : 'KB 检测桩');
  },

  onSpecAudit() {
    toast('过审提示桩：脸部位姿 / 底色 / 尺寸');
  },

  onExportSave() {
    const path = this.data.imagePath;
    if (!path) {
      toast('当前为占位画布，没有可保存的图片');
      return;
    }
    exportService
      .saveToAlbum(path)
      .then(() => {
        exportService.recordWork({
          imagePath: path,
          specContext: this.data.specContext
        });
        this.setData({ showExport: false });
        toast('已保存到相册', 'success');
      })
      .catch((err) => {
        const msg = (err && err.errMsg) || '';
        if (msg.indexOf('auth') !== -1 || msg.indexOf('auth deny') !== -1) {
          wx.openSetting({});
          return;
        }
        toast('保存失败');
      });
  },

  onExportHd() {
    exportService.exportHd().catch(() => {
      toast('高清导出为桩，尚未接入超分');
    });
  },

  onExportShare() {
    exportService.shareStub().catch(() => {
      toast('分享为桩');
    });
  },

  onExportSaveId() {
    this.setData({ showExport: false });
    if (this.data.specContext) {
      toast('另存证件照（桩）：将走规格校验与排版');
      return;
    }
    wx.switchTab({ url: '/pages/idphoto/idphoto' });
  },

  onShareAppMessage() {
    return {
      title: displaySpecName(this.data.specContext) || '最美证件照 · 全能修图',
      path: '/pages/retouch/retouch'
    };
  }
});
