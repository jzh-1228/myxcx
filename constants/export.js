const KB_PRESETS = [
  { id: '20', kb: 20, label: '≤20KB' },
  { id: '50', kb: 50, label: '≤50KB' },
  { id: '200', kb: 200, label: '≤200KB' },
  { id: 'custom', kb: 0, label: '自定义' }
];

const DEFAULT_TARGET_KB = 50;
const MIN_TARGET_KB = 5;
const MAX_TARGET_KB = 10240;
const MIN_QUALITY = 0.12;
const MAX_QUALITY = 0.92;
const QUALITY_GAP = 0.04;
const QUALITY_ITERS = 8;

const DISCLAIMER = '本地预检，以受理机关要求为准';

const AUDIT_STATUS_TEXT = {
  pass: '通过',
  warn: '提醒',
  fail: '未过',
  skip: '跳过'
};

function findPreset(kb) {
  const n = Number(kb);
  if (!n) return KB_PRESETS[3];
  return KB_PRESETS.find((item) => item.kb === n) || KB_PRESETS[3];
}

function presetById(id) {
  return KB_PRESETS.find((item) => item.id === id) || KB_PRESETS[1];
}

module.exports = {
  KB_PRESETS,
  DEFAULT_TARGET_KB,
  MIN_TARGET_KB,
  MAX_TARGET_KB,
  MIN_QUALITY,
  MAX_QUALITY,
  QUALITY_GAP,
  QUALITY_ITERS,
  DISCLAIMER,
  AUDIT_STATUS_TEXT,
  findPreset,
  presetById
};
