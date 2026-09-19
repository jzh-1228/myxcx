Component({
  properties: {
    show: { type: Boolean, value: false }
  },
  methods: {
    noop() {},
    onClose() {
      this.triggerEvent('close');
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
