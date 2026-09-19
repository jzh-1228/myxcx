const BG_PRESETS = [
  { id: 'white', name: '白', hex: 'FFFFFF' },
  { id: 'blue', name: '蓝', hex: '438EDB' },
  { id: 'red', name: '红', hex: 'C9372C' }
];

const PROVIDERS = [
  { id: 'hivision', name: 'Hivision（自托管）' },
  { id: 'webhook', name: '通用 Webhook' },
  { id: 'aliyun', name: '阿里云 SegmentBody（桩）' }
];

function normalizeHex(input) {
  let s = String(input || '').trim().replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{3}$/.test(s)) {
    s = s
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9A-F]{6}$/.test(s)) {
    const err = {
      code: 'MATTING_BAD_COLOR',
      message: '底色须为 6 位十六进制，例如 FFFFFF 或 #438EDB'
    };
    throw err;
  }
  return s;
}

function nameToHex(name) {
  const found = BG_PRESETS.find((item) => item.name === name || item.id === name);
  if (found) return found.hex;
  return normalizeHex(name);
}

function hexToName(hex) {
  try {
    const n = normalizeHex(hex);
    const found = BG_PRESETS.find((item) => item.hex === n);
    return found ? found.name : '自定义';
  } catch (e) {
    return '自定义';
  }
}

module.exports = {
  BG_PRESETS,
  PROVIDERS,
  normalizeHex,
  nameToHex,
  hexToName
};
