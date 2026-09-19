Component({
  properties: {
    specName: { type: String, value: '' },
    bgColor: { type: String, value: '白' },
    sizeText: { type: String, value: '' },
    collapsed: { type: Boolean, value: false }
  },
  data: {
    title: ''
  },
  observers: {
    'specName, bgColor': function (specName, bgColor) {
      const name = specName || '规格';
      const bg = bgColor || '白';
      const title = name.indexOf('底') >= 0 ? name : `${name}${bg}底`;
      this.setData({ title });
    }
  },
  methods: {
    onToggle() {
      this.triggerEvent('toggle');
    },
    onColor() {
      this.triggerEvent('color');
    },
    onKb() {
      this.triggerEvent('kb');
    },
    onAudit() {
      this.triggerEvent('audit');
    }
  }
});
