Component({
  properties: {
    label: { type: String, value: '' },
    name: { type: String, value: '' },
    value: { type: Number, value: 0 },
    min: { type: Number, value: 0 },
    max: { type: Number, value: 100 }
  },
  methods: {
    emit(value, live) {
      this.triggerEvent('change', {
        key: this.data.name,
        value,
        live: !!live
      });
    },
    onChanging(e) {
      const value = e.detail.value;
      this.setData({ value });
      this.emit(value, true);
    },
    onChange(e) {
      const value = e.detail.value;
      this.setData({ value });
      this.emit(value, false);
    }
  }
});
