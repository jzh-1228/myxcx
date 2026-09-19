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
const {
  KB_PRESETS,
  DEFAULT_TARGET_KB,
  DISCLAIMER,
  findPreset
} = require('../../constants/export');
const storage = require('../../utils/storage');
const { getStatusBarHeight, toast } = require('../../utils/system');
const { takeEditorSession } = require('../../utils/session');
const { isConfigured } = require('../../utils/matting-config');
const ai = require('../../services/ai');
const exportService = require('../../services/export');
const compress = require('../../services/compress');
const audit = require('../../services/audit');
const {
  MODE_COMPLIANCE,
  MODE_BEAUTY,
  skinSliderList,
  slidersFromList,
  naturalPreset,
  clampValue
} = require('../../constants/beauty');
const { defaultEditorMode } = require('../../utils/beauty-config');
const matting = require('../../services/matting');
const { notConfigured } = require('../../services/matting/errors');
const beauty = require('../../services/beauty');

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
    hasSpec: false,
    specCollapsed: false,
    comparing: false,
    showExport: false,
    canvasHint: '人像画布',
    portraitChips: PORTRAIT_CHIPS,
    portraitSub: 'skin',
    portraitTitle: '美肤',
    portraitSliders: skinSliderList(MODE_BEAUTY),
    beautyMode: MODE_BEAUTY,
    beautyMax: 70,
    beautyBasePath: '',
    beautyLabel: '',
    beautyBusy: false,
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
    historyIndex: -1,
    exportPreset: '50',
    exportCustomKb: '',
    exportTargetKb: DEFAULT_TARGET_KB,
    exportCurrentKbText: '',
    exportPreviewText: '',
    exportPreviewPath: '',
    exportPreviewKb: 0,
    exportPreviewQuality: 0,
    exportPreviewWidth: 0,
    exportPreviewHeight: 0,
    exportCompressed: false,
    exportBusy: false,
    auditItems: [],
    auditSummary: '',
    auditLevel: '',
    showAuditRestore: false,
    auditDisclaimer: DISCLAIMER
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
      hasSpec: !!specContext,
      canvasHint: canvasHint(mode, specContext),
      beautyMode: defaultEditorMode(!!specContext),
      beautyBasePath: session.beautyBasePath || (draft && draft.beautyBasePath) || session.imagePath || imagePath,
      beautyLabel: session.beautyLabel || (draft && draft.beautyLabel) || ''
    };
    next.portraitSliders = skinSliderList(next.beautyMode);
    next.beautyMax = next.beautyMode === MODE_COMPLIANCE ? 35 : 70;
    const savedKb = storage.getSettings().exportTargetKb || DEFAULT_TARGET_KB;
    const preset = findPreset(savedKb);
    next.exportTargetKb = preset.id === 'custom' ? savedKb : preset.kb || DEFAULT_TARGET_KB;
    next.exportPreset = preset.id;
    next.exportCustomKb = preset.id === 'custom' ? String(savedKb) : '';
    next.auditDisclaimer = DISCLAIMER;

    if (mode === 'portrait') {
      const chip = findChip(sub || 'skin');
      next.portraitSub = chip.id;
      next.portraitTitle = chip.name;
      if (chip.id !== 'skin') {
        next.portraitSliders = clone(chip.sliders);
      }
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
    const shouldBeauty = query.autoBeauty === '1' || session.autoBeauty;

    this.setData(next, () => {
      this.pushHistory();
      if (shouldAuto && next.imagePath && !mattePath) {
        this.runMatte();
      } else if (shouldBeauty && next.imagePath) {
        this.setData({ portraitSliders: skinSliderList(next.beautyMode, naturalPreset(next.beautyMode)) }, () => {
          this.applyBeauty();
        });
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
      bgHex: d.bgHex,
      beautyMode: d.beautyMode,
      beautyBasePath: d.beautyBasePath,
      beautyLabel: d.beautyLabel
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
      hasSpec: !!state.specContext,
      imagePath: state.imagePath,
      sourcePath: state.sourcePath,
      mattePath: state.mattePath,
      bgHex: state.bgHex || '',
      customBg: !!(state.bgHex && !BG_PRESETS.some((item) => item.hex === state.bgHex)),
      editSheetTitle: editSheetTitle(state.editTool),
      canvasHint: canvasHint(state.mode, state.specContext),
      beautyMode: state.beautyMode || MODE_BEAUTY,
      beautyBasePath: state.beautyBasePath || '',
      beautyLabel: state.beautyLabel || '',
      beautyMax: (state.beautyMode || MODE_BEAUTY) === MODE_COMPLIANCE ? 35 : 70
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
      beautyBasePath: this.data.beautyBasePath,
      beautyLabel: this.data.beautyLabel,
      beautyMode: this.data.beautyMode,
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
    this.refreshExportMeasure();
  },

  onCloseExport() {
    this.setData({ showExport: false });
  },

  currentExportSliders() {
    return slidersFromList(this.data.portraitSliders);
  },

  resolveTargetKb() {
    if (this.data.exportPreset === 'custom') {
      return compress.parseTargetKb(this.data.exportCustomKb);
    }
    const preset = KB_PRESETS.find((item) => item.id === this.data.exportPreset);
    return (preset && preset.kb) || this.data.exportTargetKb || DEFAULT_TARGET_KB;
  },

  persistTargetKb(kb) {
    if (!kb) return;
    storage.saveSettings({ exportTargetKb: kb });
  },

  compressPayload() {
    return {
      imagePath: this.data.imagePath,
      targetKb: this.resolveTargetKb(),
      needAlpha: !!(this.data.mattePath && !this.data.bgHex),
      hasMatte: !!this.data.mattePath,
      bgHex: this.data.bgHex,
      spec: this.data.specContext
    };
  },

  refreshExportMeasure() {
    const path = this.data.imagePath;
    if (!path) {
      this.setData({ exportCurrentKbText: '无图片', exportPreviewText: '' });
      return;
    }
    compress.measureImage(path).then((info) => {
      this.setData({
        exportCurrentKbText: info.kb ? compress.formatKb(info.kb) : '未知'
      });
    });
  },

  applyCompressResult(result, fromPreview) {
    const q = result.quality != null ? compress.qualityPercent(result.quality) : '';
    const fmt = result.format === 'png' ? 'PNG' : result.format === 'jpeg' ? 'JPEG' : '原文件';
    const previewText = result.keptAlpha
      ? `预览 ${compress.formatKb(result.kb)} · ${fmt}`
      : `预览 ${compress.formatKb(result.kb)} · ${fmt}${q ? ' ' + q : ''}`;
    this.setData({
      exportPreviewPath: result.filePath,
      exportPreviewKb: result.kb,
      exportPreviewQuality: result.quality || 0,
      exportPreviewWidth: result.width || 0,
      exportPreviewHeight: result.height || 0,
      exportPreviewText: previewText,
      exportCompressed: true,
      exportTargetKb: result.targetKb || this.resolveTargetKb(),
      exportBusy: false
    });
    if (fromPreview) {
      if (result.metTarget) {
        toast(`预览 ${compress.formatKb(result.kb)}`, 'success');
      } else {
        toast(result.message || `预览 ${compress.formatKb(result.kb)}（未达目标）`);
      }
    }
    return result;
  },

  runCompress(fromPreview) {
    const path = this.data.imagePath;
    if (!path) {
      return Promise.reject({ code: 'NO_IMAGE', message: '当前为占位画布，没有可导出的图片' });
    }
    if (this.data.exportBusy) {
      return Promise.reject({ code: 'BUSY', message: '正在处理' });
    }
    const targetKb = this.resolveTargetKb();
    this.persistTargetKb(targetKb);
    this.setData({ exportBusy: true, exportTargetKb: targetKb });
    wx.showLoading({ title: fromPreview ? '预览压缩中' : '压缩导出中', mask: true });
    return exportService
      .exportImage(this.compressPayload())
      .then((result) => {
        wx.hideLoading();
        return this.applyCompressResult(result, fromPreview);
      })
      .catch((err) => {
        wx.hideLoading();
        this.setData({ exportBusy: false });
        throw err;
      });
  },

  auditPayload(result) {
    const measured = result || {};
    return {
      imagePath: measured.filePath || this.data.imagePath,
      width: measured.width,
      height: measured.height,
      spec: this.data.specContext,
      hasMatte: !!this.data.mattePath,
      bgHex: this.data.bgHex,
      bytes: measured.bytes,
      targetKb: this.resolveTargetKb(),
      compressed: !!this.data.exportCompressed,
      sliders: this.currentExportSliders(),
      beautyMode: this.data.beautyMode
    };
  },

  applyAuditReport(report) {
    this.setData({
      auditItems: report.items || [],
      auditSummary: (report.summary && report.summary.text) || '',
      auditLevel: (report.summary && report.summary.level) || '',
      showAuditRestore: !!report.beautyOverCap,
      auditDisclaimer: report.disclaimer || DISCLAIMER
    });
    return report;
  },

  runAudit(afterCompress) {
    const path = this.data.imagePath;
    if (!path) {
      toast('当前为占位画布，没有可检查的图片');
      return Promise.resolve();
    }
    const targetKb = this.resolveTargetKb();
    this.persistTargetKb(targetKb);
    wx.showLoading({ title: '过审检查中', mask: true });
    const ready = afterCompress
      ? Promise.resolve(afterCompress)
      : this.data.exportCompressed && this.data.exportPreviewPath
        ? Promise.resolve({
            filePath: this.data.exportPreviewPath,
            bytes: Math.round((this.data.exportPreviewKb || 0) * 1024),
            width: this.data.exportPreviewWidth,
            height: this.data.exportPreviewHeight
          })
        : compress.measureImage(path);

    return ready
      .then((measured) => {
        const payload = this.auditPayload(
          afterCompress ||
            (measured.filePath
              ? measured
              : {
                  filePath: path,
                  bytes: measured.bytes,
                  width: measured.width,
                  height: measured.height
                })
        );
        if (!payload.width && measured.width) payload.width = measured.width;
        if (!payload.height && measured.height) payload.height = measured.height;
        return audit.inspectAndEvaluate(payload);
      })
      .then((report) => {
        wx.hideLoading();
        this.applyAuditReport(report);
        return report;
      })
      .catch((err) => {
        wx.hideLoading();
        toast((err && err.message) || '过审检查失败');
      });
  },

  onExportPreset(e) {
    const id = (e.detail && e.detail.id) || '50';
    const preset = KB_PRESETS.find((item) => item.id === id) || KB_PRESETS[1];
    const next = {
      exportPreset: preset.id,
      exportCompressed: false,
      exportPreviewPath: '',
      exportPreviewText: '',
      exportPreviewWidth: 0,
      exportPreviewHeight: 0
    };
    if (preset.id !== 'custom') {
      next.exportTargetKb = preset.kb;
      this.persistTargetKb(preset.kb);
    }
    this.setData(next);
  },

  onExportCustom(e) {
    const value = (e.detail && e.detail.value) || '';
    this.setData({
      exportCustomKb: value,
      exportTargetKb: compress.parseTargetKb(value),
      exportCompressed: false,
      exportPreviewPath: '',
      exportPreviewText: '',
      exportPreviewWidth: 0,
      exportPreviewHeight: 0
    });
  },

  onExportPreview() {
    this.runCompress(true).catch((err) => {
      if (err && err.code === 'BUSY') return;
      toast((err && err.message) || '压缩失败');
    });
  },

  onExportAudit() {
    this.setData({ showExport: true });
    this.runAudit();
  },

  onRestoreCompliance() {
    this.setData({
      beautyMode: MODE_COMPLIANCE,
      beautyMax: 35,
      portraitSub: 'skin',
      portraitTitle: '美肤',
      portraitSliders: skinSliderList(MODE_COMPLIANCE, slidersFromList(this.data.portraitSliders)),
      mode: 'portrait'
    });
    toast('已恢复合规强度');
    this.scheduleBeauty();
    if (this.data.showExport) {
      this.runAudit();
    }
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
    const next = {
      portraitSub: chip.id,
      portraitTitle: chip.name,
      portraitSliders: clone(chip.sliders)
    };
    if (chip.id === 'skin') {
      next.portraitSliders = skinSliderList(this.data.beautyMode, slidersFromList(this.data.portraitSliders));
    }
    this.setData(next);
    this.pushHistory();
  },

  onBeautyMode(e) {
    const beautyMode = e.currentTarget.dataset.mode === MODE_COMPLIANCE ? MODE_COMPLIANCE : MODE_BEAUTY;
    const sliders = slidersFromList(this.data.portraitSliders);
    this.setData({
      beautyMode,
      beautyMax: beautyMode === MODE_COMPLIANCE ? 35 : 70,
      portraitSliders: skinSliderList(beautyMode, sliders)
    });
    this.scheduleBeauty();
  },

  onNaturalBeauty() {
    this.setData({
      portraitSub: 'skin',
      portraitTitle: '美肤',
      portraitSliders: skinSliderList(this.data.beautyMode, naturalPreset(this.data.beautyMode))
    });
    this.applyBeauty();
  },

  onApplyBeauty() {
    this.applyBeauty();
  },

  scheduleBeauty() {
    if (this._beautyTimer) clearTimeout(this._beautyTimer);
    this._beautyTimer = setTimeout(() => {
      this.applyBeauty();
    }, 480);
  },

  applyBeauty() {
    const source = this.data.beautyBasePath || this.data.imagePath;
    if (!source) {
      toast('请先导入照片');
      return;
    }
    if (this.data.beautyBusy || this.data.mattingBusy) return;
    const sliders = slidersFromList(this.data.portraitSliders);
    sliders.smooth = clampValue(sliders.smooth, this.data.beautyMode);
    sliders.whiten = clampValue(sliders.whiten, this.data.beautyMode);
    sliders.blemish = clampValue(sliders.blemish, this.data.beautyMode);
    if (!this.data.beautyBasePath) {
      this.setData({ beautyBasePath: this.data.imagePath });
    }
    this.setData({ beautyBusy: true });
    wx.showLoading({ title: '弱美颜处理中', mask: true });
    beauty
      .beautify({
        imagePath: this.data.beautyBasePath || this.data.imagePath,
        smooth: sliders.smooth,
        whiten: sliders.whiten,
        blemish: sliders.blemish,
        mode: this.data.beautyMode
      })
      .then((res) => {
        wx.hideLoading();
        if (res.unchanged) {
          this.setData({
            beautyBusy: false,
            imagePath: this.data.beautyBasePath || this.data.imagePath,
            beautyLabel: ''
          });
          this.pushHistory();
          toast('强度为 0，未改像素');
          return;
        }
        this.setData({
          beautyBusy: false,
          imagePath: res.imagePath,
          beautyLabel: res.label || '本地轻处理',
          comparing: false
        });
        this.pushHistory();
        toast(res.label === '云端美颜' ? '已应用云端弱美颜' : '已应用本地轻处理', 'success');
      })
      .catch((err) => {
        wx.hideLoading();
        this.setData({ beautyBusy: false });
        beauty.showError(err);
      });
  },

  onSliderChange(e) {
    const { key, value, live } = e.detail;
    if (key === 'filterStrength') {
      this.setData({ filterStrength: value });
    } else if (this.data.mode === 'portrait') {
      const portraitSliders = this.data.portraitSliders.map((item) => {
        if (item.key !== key) return item;
        const nextVal =
          this.data.portraitSub === 'skin' ? clampValue(value, this.data.beautyMode) : value;
        return Object.assign({}, item, { value: nextVal });
      });
      this.setData({ portraitSliders });
      if (!live && this.data.portraitSub === 'skin') {
        this.scheduleBeauty();
        return;
      }
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
          beautyBasePath: res.imagePath,
          beautyLabel: '',
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
          beautyBasePath: res.imagePath,
          beautyLabel: '',
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
    this.setData({ showExport: true });
    this.refreshExportMeasure();
  },

  onSpecAudit() {
    this.setData({ showExport: true });
    this.refreshExportMeasure();
    this.runAudit();
  },

  onExportSave() {
    const path = this.data.imagePath;
    if (!path) {
      toast('当前为占位画布，没有可保存的图片');
      return;
    }
    const finishSave = (result) => {
      const filePath = (result && result.filePath) || path;
      return exportService.saveToAlbum(filePath).then(() => {
        exportService.recordWork({
          imagePath: filePath,
          specContext: this.data.specContext,
          kb: result && result.kb,
          targetKb: result && result.targetKb,
          metTarget: result && result.metTarget,
          quality: result && result.quality
        });
        this.setData({ showExport: false });
        if (result && result.kb) {
          if (result.metTarget) {
            toast(`已保存 ${compress.formatKb(result.kb)}`, 'success');
          } else {
            wx.showModal({
              title: '已保存（尽力压缩）',
              content: `${result.message || ''} 实际 ${compress.formatKb(result.kb)}。${DISCLAIMER}`,
              showCancel: false
            });
          }
        } else {
          toast('已保存到相册', 'success');
        }
      });
    };

    const cached =
      this.data.exportCompressed &&
      this.data.exportPreviewPath &&
      this.data.exportTargetKb === this.resolveTargetKb();

    const job = cached
      ? Promise.resolve({
          filePath: this.data.exportPreviewPath,
          kb: this.data.exportPreviewKb,
          targetKb: this.data.exportTargetKb,
          metTarget: !this.data.exportTargetKb || this.data.exportPreviewKb <= this.data.exportTargetKb,
          quality: this.data.exportPreviewQuality,
          message: this.data.exportPreviewText
        })
      : this.runCompress(false);

    job
      .then(finishSave)
      .catch((err) => {
        if (err && err.code === 'BUSY') return;
        const msg = (err && (err.errMsg || err.message)) || '';
        if (msg.indexOf('auth') !== -1 || msg.indexOf('auth deny') !== -1) {
          wx.openSetting({});
          return;
        }
        toast(msg || '保存失败');
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
