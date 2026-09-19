const {
  EDITOR_MODES,
  PORTRAIT_CHIPS,
  FILTERS,
  EDIT_TOOLS,
  ADJUST_SLIDERS,
  CREATE_TOOLS,
  CREATE_TEMPLATES,
  AI_CAPABILITIES
} = require('../../constants/editor');
const { BG_PRESETS, nameToHex, hexToName, normalizeHex } = require('../../constants/matting');
const { findSpec, displaySpecName } = require('../../constants/specs');
const storage = require('../../utils/storage');
const { getStatusBarHeight, toast } = require('../../utils/system');
const { takeEditorSession } = require('../../utils/session');
const { isConfigured } = require('../../utils/matting-config');
const ai = require('../../services/ai');
const exportService = require('../../services/export');
const matting = require('../../services/matting');
const { notConfigured } = require('../../services/matting/errors');

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

function editSheetTitle(editTool) {
  if (editTool === 'adjust') return '调节';
  if (editTool === 'matting') return '抠图 / 换底';
  return '编辑工具';
}

function safeNameToHex(name) {
  try {
    return nameToHex(name);
  } catch (e) {
    return '';
  }
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
    sourcePath: '',
    mattePath: '',
    bgHex: '',
    customBg: false,
    mattingBusy: false,
    showHexDialog: false,
    hexDraft: '',
    bgPresets: BG_PRESETS,
    editTools: EDIT_TOOLS,
    editTool: '',
    editSheetTitle: '编辑工具',
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
    const session = takeEditorSession() || {};
    const draft = draftId ? storage.getDraft(draftId) : null;
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

    const sourcePath = session.sourcePath || (draft && draft.sourcePath) || imagePath;
    const mattePath = session.mattePath || (draft && draft.mattePath) || '';
    let bgHex = session.bgHex || (draft && draft.bgHex) || '';
    if (!bgHex && specContext) {
      try {
        bgHex = nameToHex(specContext.bgColor);
      } catch (e) {
        bgHex = '';
      }
    }

    const next = {
      statusBarHeight: getStatusBarHeight(),
      imagePath: session.imagePath || imagePath,
      sourcePath,
      mattePath,
      bgHex,
      customBg: !!(bgHex && !BG_PRESETS.some((item) => item.hex === bgHex)),
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
      next.editSheetTitle = editSheetTitle(sub || '');
    } else if (mode === 'create') {
      next.createTool = sub || 'template';
    } else if (mode === 'ai') {
      next.aiCap = sub || '';
    }

    const shouldAuto =
      query.autoMatte === '1' ||
      session.autoMatte ||
      sub === 'matting';

    this.setData(next, () => {
      this.pushHistory();
      if (shouldAuto && next.imagePath && !mattePath) {
        this.runMatte();
      }
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
      specContext: d.specContext,
      imagePath: d.imagePath,
      sourcePath: d.sourcePath,
      mattePath: d.mattePath,
      bgHex: d.bgHex
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
      imagePath: state.imagePath,
      sourcePath: state.sourcePath,
      mattePath: state.mattePath,
      bgHex: state.bgHex || '',
      customBg: !!(state.bgHex && !BG_PRESETS.some((item) => item.hex === state.bgHex)),
      editSheetTitle: editSheetTitle(state.editTool),
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
      sourcePath: this.data.sourcePath,
      mattePath: this.data.mattePath,
      bgHex: this.data.bgHex,
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
    if (!this.data.sourcePath) {
      toast('没有原图可对比');
      return;
    }
    this.setData({ comparing: !this.data.comparing });
  },

  noop() {},

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
    this.setData({
      editTool: id,
      editSheetTitle: editSheetTitle(id)
    });
    this.pushHistory();
    if (id === 'matting') {
      return;
    }
    if (id !== 'adjust') {
      toast(`编辑桩：${id}，算法未接入`);
    }
  },

  onRunMatte() {
    this.runMatte();
  },

  runMatte() {
    const source = this.data.sourcePath || this.data.imagePath;
    if (!source) {
      toast('请先导入照片');
      return;
    }
    if (this.data.mattingBusy) return;
    if (!isConfigured()) {
      matting.showError(notConfigured());
      return;
    }
    this.setData({ mattingBusy: true, mode: 'edit', editTool: 'matting', editSheetTitle: editSheetTitle('matting') });
    wx.showLoading({ title: '抠图中', mask: true });
    const bgHex = this.data.bgHex || (this.data.specContext ? safeNameToHex(this.data.specContext.bgColor) : '');
    matting
      .matte({ imagePath: source })
      .then((res) => {
        if (!bgHex) {
          return { mattePath: res.mattePath, imagePath: res.mattePath, colorHex: '' };
        }
        return matting.addBackground({ mattePath: res.mattePath, colorHex: bgHex }).then((bg) => ({
          mattePath: res.mattePath,
          imagePath: bg.imagePath,
          colorHex: bg.colorHex
        }));
      })
      .then((res) => {
        wx.hideLoading();
        this.setData({
          mattingBusy: false,
          sourcePath: source,
          mattePath: res.mattePath,
          imagePath: res.imagePath,
          bgHex: res.colorHex || this.data.bgHex,
          comparing: false
        });
        this.pushHistory();
        toast('抠图完成', 'success');
      })
      .catch((err) => {
        wx.hideLoading();
        this.setData({ mattingBusy: false });
        matting.showError(err);
      });
  },

  onBgPreset(e) {
    this.applyBackground(e.currentTarget.dataset.hex);
  },

  onCustomBg() {
    this.setData({
      showHexDialog: true,
      hexDraft: this.data.customBg ? this.data.bgHex : ''
    });
  },

  onHexDraft(e) {
    this.setData({ hexDraft: e.detail.value || '' });
  },

  onCancelHex() {
    this.setData({ showHexDialog: false });
  },

  onConfirmHex() {
    try {
      const hex = normalizeHex(this.data.hexDraft);
      this.setData({ showHexDialog: false });
      this.applyBackground(hex);
    } catch (err) {
      toast(err.message || '底色格式不正确');
    }
  },

  applyBackground(hex) {
    const source = this.data.sourcePath || this.data.imagePath;
    if (!source) {
      toast('请先导入照片');
      return;
    }
    if (this.data.mattingBusy) return;
    let colorHex;
    try {
      colorHex = normalizeHex(hex);
    } catch (err) {
      toast(err.message);
      return;
    }
    this.setData({ mattingBusy: true });
    wx.showLoading({ title: '换底中', mask: true });
    matting
      .replaceBackground({
        imagePath: source,
        sourcePath: source,
        mattePath: this.data.mattePath,
        colorHex
      })
      .then((res) => {
        wx.hideLoading();
        const specContext = this.data.specContext
          ? Object.assign({}, this.data.specContext, { bgColor: hexToName(colorHex) })
          : this.data.specContext;
        this.setData({
          mattingBusy: false,
          sourcePath: res.sourcePath,
          mattePath: res.mattePath,
          imagePath: res.imagePath,
          bgHex: res.colorHex,
          customBg: !BG_PRESETS.some((item) => item.hex === res.colorHex),
          specContext,
          comparing: false
        });
        this.pushHistory();
        toast('已换底', 'success');
      })
      .catch((err) => {
        wx.hideLoading();
        this.setData({ mattingBusy: false });
        matting.showError(err);
      });
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
    const labels = BG_PRESETS.map((item) => `${item.name}底`).concat(['自定义']);
    wx.showActionSheet({
      itemList: labels,
      success: (res) => {
        if (res.tapIndex >= BG_PRESETS.length) {
          this.onCustomBg();
          return;
        }
        this.applyBackground(BG_PRESETS[res.tapIndex].hex);
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
