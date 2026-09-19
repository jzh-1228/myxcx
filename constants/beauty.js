const MODE_BEAUTY = 'beauty';
const MODE_COMPLIANCE = 'compliance';

const CAPS = {
  beauty: {
    max: 70,
    defaults: { smooth: 28, whiten: 22, blemish: 18 }
  },
  compliance: {
    max: 35,
    defaults: { smooth: 18, whiten: 12, blemish: 8 }
  }
};

const PRESETS = {
  natural: { smooth: 26, whiten: 20, blemish: 14 },
  naturalCompliance: { smooth: 16, whiten: 10, blemish: 8 }
};

function normalizeMode(mode) {
  return mode === MODE_COMPLIANCE ? MODE_COMPLIANCE : MODE_BEAUTY;
}

function getCap(mode) {
  return CAPS[normalizeMode(mode)];
}

function clampValue(value, mode) {
  const max = getCap(mode).max;
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(max, Math.round(n)));
}

function clampSliders(sliders, mode) {
  const src = sliders || {};
  return {
    smooth: clampValue(src.smooth, mode),
    whiten: clampValue(src.whiten, mode),
    blemish: clampValue(src.blemish, mode)
  };
}

function skinSliderList(mode, values) {
  const cap = getCap(mode);
  const vals = clampSliders(values || cap.defaults, mode);
  return [
    { key: 'smooth', label: '磨皮', value: vals.smooth, max: cap.max },
    { key: 'whiten', label: '美白', value: vals.whiten, max: cap.max },
    { key: 'blemish', label: '祛瑕', value: vals.blemish, max: cap.max }
  ];
}

function slidersFromList(list) {
  const out = { smooth: 0, whiten: 0, blemish: 0 };
  (list || []).forEach((item) => {
    if (item && out[item.key] !== undefined) out[item.key] = item.value;
  });
  return out;
}

function naturalPreset(mode) {
  return normalizeMode(mode) === MODE_COMPLIANCE ? PRESETS.naturalCompliance : PRESETS.natural;
}

function toHivisionBeauty(sliders) {
  const s = clampSliders(sliders, MODE_BEAUTY);
  return {
    whitening_strength: Math.round(s.whiten / 10),
    brightness_strength: Number(((s.whiten / 100) * 6).toFixed(2)),
    contrast_strength: Number(((s.smooth / 100) * 2).toFixed(2)),
    sharpen_strength: 0,
    saturation_strength: Number((((s.whiten - s.blemish) / 100) * 1.5).toFixed(2))
  };
}

module.exports = {
  MODE_BEAUTY,
  MODE_COMPLIANCE,
  CAPS,
  PRESETS,
  normalizeMode,
  getCap,
  clampValue,
  clampSliders,
  skinSliderList,
  slidersFromList,
  naturalPreset,
  toHivisionBeauty
};
