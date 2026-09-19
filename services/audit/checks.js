const { MODE_COMPLIANCE, getCap } = require('../../constants/beauty');
const { specPixelText } = require('../../constants/specs');
const { AUDIT_STATUS_TEXT, DISCLAIMER } = require('../../constants/export');
const { bytesToKb, formatKb } = require('../compress/search');

function item(id, label, status, detail) {
  return {
    id,
    label,
    status,
    detail: detail || '',
    statusText: AUDIT_STATUS_TEXT[status] || status,
    statusClass: `audit-${status}`
  };
}

function hexToRgb(hex) {
  const s = String(hex || '')
    .replace('#', '')
    .toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(s)) return null;
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16)
  };
}

function colorDist(a, b) {
  if (!a || !b) return 999;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function sampleBorderStats(data, w, h) {
  const width = Number(w) || 0;
  const height = Number(h) || 0;
  if (!data || !width || !height) return { count: 0 };
  const band = Math.max(1, Math.round(Math.min(width, height) * 0.08));
  let n = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  const lumas = [];

  function acc(x, y) {
    const i = (y * width + x) * 4;
    if (i < 0 || i + 3 >= data.length) return;
    if (data[i + 3] < 200) return;
    sumR += data[i];
    sumG += data[i + 1];
    sumB += data[i + 2];
    lumas.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    n += 1;
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < band; y++) acc(x, y);
    for (let y = height - band; y < height; y++) acc(x, y);
  }
  for (let y = band; y < height - band; y++) {
    for (let x = 0; x < band; x++) acc(x, y);
    for (let x = width - band; x < width; x++) acc(x, y);
  }

  if (!n) return { count: 0 };
  const meanR = sumR / n;
  const meanG = sumG / n;
  const meanB = sumB / n;
  const meanL = lumas.reduce((a, b) => a + b, 0) / n;
  let varL = 0;
  for (let i = 0; i < lumas.length; i++) {
    const d = lumas[i] - meanL;
    varL += d * d;
  }
  return {
    count: n,
    meanR,
    meanG,
    meanB,
    stdL: Math.sqrt(varL / n)
  };
}

function checkPixelSize(input) {
  const spec = input && input.spec;
  const width = Number(input && input.width) || 0;
  const height = Number(input && input.height) || 0;
  if (!spec || !spec.width || !spec.height) {
    return item('pixels', '像素尺寸', 'skip', '未选证件照规格，跳过尺寸对照');
  }
  const expect = specPixelText(spec);
  if (!width || !height) {
    return item('pixels', '像素尺寸', 'warn', `无法读取输出尺寸，规格为 ${expect}`);
  }
  const dw = Math.abs(width - spec.width) / spec.width;
  const dh = Math.abs(height - spec.height) / spec.height;
  if (dw === 0 && dh === 0) {
    return item('pixels', '像素尺寸', 'pass', `输出 ${width}×${height}，与规格 ${expect} 一致`);
  }
  if (dw <= 0.05 && dh <= 0.05) {
    return item(
      'pixels',
      '像素尺寸',
      'warn',
      `当前 ${width}×${height}，规格 ${expect}，偏差约 ${Math.round(Math.max(dw, dh) * 100)}%`
    );
  }
  return item('pixels', '像素尺寸', 'fail', `当前 ${width}×${height}，规格要求 ${expect}`);
}

function checkAspect(input) {
  const spec = input && input.spec;
  const width = Number(input && input.width) || 0;
  const height = Number(input && input.height) || 0;
  if (!spec || !spec.width || !spec.height) {
    return item('aspect', '画布比例', 'skip', '未选证件照规格，跳过比例检查');
  }
  if (!width || !height) {
    return item('aspect', '画布比例', 'warn', '无法读取画布宽高');
  }
  const actual = width / height;
  const expect = spec.width / spec.height;
  const delta = Math.abs(actual - expect);
  const text = `当前 ${actual.toFixed(3)}，规格 ${expect.toFixed(3)}`;
  if (delta <= 0.015) {
    return item('aspect', '画布比例', 'pass', `${text}，与规格一致`);
  }
  if (delta <= 0.05) {
    return item('aspect', '画布比例', 'warn', `${text}，略有偏差`);
  }
  return item('aspect', '画布比例', 'fail', `${text}，画布与规格比例不符`);
}

function checkBackground(input) {
  const hasMatte = !!(input && input.hasMatte);
  const bgHex = (input && input.bgHex) || '';
  const stats = input && input.borderStats;
  if (!hasMatte && !bgHex) {
    return item('background', '底色均匀', 'skip', '未抠图换底，跳过底色启发式检查');
  }
  if (hasMatte && !bgHex) {
    return item('background', '底色均匀', 'skip', '透明底保留 Alpha，不检查实色底');
  }
  if (!stats || !stats.count) {
    return item('background', '底色均匀', 'warn', '已换底但无法取样边缘像素');
  }
  const std = Number(stats.stdL) || 0;
  const mean = { r: stats.meanR, g: stats.meanG, b: stats.meanB };
  const target = hexToRgb(bgHex);
  const dist = target ? colorDist(mean, target) : 0;
  if (std <= 12 && dist <= 36) {
    return item('background', '底色均匀', 'pass', `边缘色差低（σ=${std.toFixed(1)}），近似实色底`);
  }
  if (std <= 28 && dist <= 60) {
    return item('background', '底色均匀', 'warn', `边缘不够均匀（σ=${std.toFixed(1)}），建议再换底`);
  }
  return item('background', '底色均匀', 'fail', `边缘色差较大（σ=${std.toFixed(1)}），不太像实色底`);
}

function checkFileSize(input) {
  const targetKb = Number(input && input.targetKb) || 0;
  const bytes = Number(input && input.bytes) || 0;
  if (!targetKb) {
    return item('filesize', '文件体积', 'skip', '未设目标 KB');
  }
  if (!bytes) {
    return item('filesize', '文件体积', 'warn', `已设目标 ≤${formatKb(targetKb)}，尚未测到文件字节`);
  }
  const kb = bytesToKb(bytes);
  const compressed = !!(input && input.compressed);
  if (kb <= targetKb) {
    return item('filesize', '文件体积', 'pass', `${formatKb(kb)} ≤ ${formatKb(targetKb)}`);
  }
  if (!compressed) {
    return item(
      'filesize',
      '文件体积',
      'warn',
      `当前 ${formatKb(kb)}，导出时将尝试压到 ≤${formatKb(targetKb)}`
    );
  }
  if (kb <= targetKb * 1.2) {
    return item(
      'filesize',
      '文件体积',
      'warn',
      `尽力压缩后 ${formatKb(kb)}，略超目标 ${formatKb(targetKb)}`
    );
  }
  return item(
    'filesize',
    '文件体积',
    'fail',
    `尽力压缩后仍为 ${formatKb(kb)}，目标 ≤${formatKb(targetKb)}`
  );
}

function slidersOverCompliance(sliders) {
  const cap = getCap(MODE_COMPLIANCE).max;
  const s = sliders || {};
  const keys = [
    { key: 'smooth', name: '磨皮' },
    { key: 'whiten', name: '美白' },
    { key: 'blemish', name: '祛瑕' }
  ];
  return keys.filter((row) => (Number(s[row.key]) || 0) > cap).map((row) => `${row.name}${s[row.key]}`);
}

function isBeautyOverCompliance(sliders) {
  return slidersOverCompliance(sliders).length > 0;
}

function checkBeauty(input) {
  const cap = getCap(MODE_COMPLIANCE).max;
  const sliders = (input && input.sliders) || {};
  const over = slidersOverCompliance(sliders);
  const mode = input && input.beautyMode;
  const modeText = mode === MODE_COMPLIANCE ? '合规' : '美颜';
  if (over.length) {
    return item(
      'beauty',
      '美颜强度',
      'warn',
      `${over.join('、')} 超过合规上限 ${cap}（当前「${modeText}」）`
    );
  }
  return item('beauty', '美颜强度', 'pass', `磨皮/美白/祛瑕均未超过合规上限 ${cap}`);
}

function checkFace() {
  return item('face', '人脸存在', 'skip', '未做人脸识别，不假装过检');
}

function summarize(items) {
  const list = items || [];
  const fail = list.filter((row) => row.status === 'fail').length;
  const warn = list.filter((row) => row.status === 'warn').length;
  const pass = list.filter((row) => row.status === 'pass').length;
  if (fail) {
    return { level: 'fail', text: `${fail} 项未通过，${warn} 项提醒` };
  }
  if (warn) {
    return { level: 'warn', text: `${pass} 项通过，${warn} 项提醒` };
  }
  return { level: 'pass', text: `${pass} 项通过` };
}

function runChecklist(input) {
  const src = input || {};
  const items = [
    checkPixelSize(src),
    checkAspect(src),
    checkBackground(src),
    checkFileSize(src),
    checkBeauty(src),
    checkFace()
  ];
  const summary = summarize(items);
  return {
    items,
    summary,
    disclaimer: DISCLAIMER,
    beautyOverCap: isBeautyOverCompliance(src.sliders)
  };
}

module.exports = {
  item,
  hexToRgb,
  colorDist,
  sampleBorderStats,
  checkPixelSize,
  checkAspect,
  checkBackground,
  checkFileSize,
  checkBeauty,
  checkFace,
  slidersOverCompliance,
  isBeautyOverCompliance,
  summarize,
  runChecklist
};
