Component({
  properties: {
    items: { type: Array, value: [] },
    summary: { type: String, value: '' },
    level: { type: String, value: '' },
    disclaimer: { type: String, value: '本地预检，以受理机关要求为准' },
    showRestore: { type: Boolean, value: false }
  },
  methods: {
    onRestore() {
      this.triggerEvent('restore');
    }
  }
});
