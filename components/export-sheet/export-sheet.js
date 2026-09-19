const { KB_PRESETS, DISCLAIMER } = require('../../constants/export');

Component({
  properties: {
    show: { type: Boolean, value: false },
    hasSpec: { type: Boolean, value: false },
    presetId: { type: String, value: '50' },
    customKb: { type: String, value: '' },
    currentKbText: { type: String, value: '' },
    previewText: { type: String, value: '' },
    disclaimer: { type: String, value: DISCLAIMER },
    auditItems: { type: Array, value: [] },
    auditSummary: { type: String, value: '' },
    auditLevel: { type: String, value: '' },
    showRestore: { type: Boolean, value: false },
    busy: { type: Boolean, value: false }
  },
  data: {
    presets: KB_PRESETS
  },
  methods: {
    noop() {},
    onClose() {
      this.triggerEvent('close');
    },
    onPreset(e) {
      this.triggerEvent('preset', { id: e.currentTarget.dataset.id });
    },
    onCustom(e) {
      this.triggerEvent('custom', { value: e.detail.value || '' });
    },
    onPreview() {
      this.triggerEvent('preview');
    },
    onAudit() {
      this.triggerEvent('audit');
    },
    onRestore() {
      this.triggerEvent('restore');
    },
    onSave() {
      this.triggerEvent('save');
    },
    onHd() {
      this.triggerEvent('hd');
    },
    onShare() {
      this.triggerEvent('share');
    },
    onSaveId() {
      this.triggerEvent('saveid');
    }
  }
});
