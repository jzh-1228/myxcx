/**
 * AI 能力桩（厂商无关）。
 * 接入时保持函数签名，仅替换内部实现，不要在页面里写死供应商。
 */

function stub(capability) {
  return function invoke(payload) {
    console.warn('[ai-stub]', capability, payload || {});
    return Promise.reject({
      code: 'AI_STUB_NOT_WIRED',
      capability,
      message: `${capability} 尚未接入供应商`
    });
  };
}

function toastStub(capability, label) {
  wx.showToast({
    title: `AI 桩：${label || capability}，待接入自有供应商`,
    icon: 'none',
    duration: 2200
  });
  return stub(capability)({ label });
}

module.exports = {
  generatePortrait: stub('generatePortrait'),
  stylingRoom: stub('stylingRoom'),
  instructEdit: stub('instructEdit'),
  referenceEdit: stub('referenceEdit'),
  enhance: stub('enhance'),
  outpaint: stub('outpaint'),
  styleTransfer: stub('styleTransfer'),
  removeObject: stub('removeObject'),
  matting: stub('matting'),
  toastStub
};
