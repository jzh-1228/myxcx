function clamp8(n) {
  return n < 0 ? 0 : n > 255 ? 255 : n;
}

function isSkinTone(r, g, b) {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cr > 133 && cr < 178 && cb > 77 && cb < 132 && r > 70 && g > 35 && r >= g;
}

function boxBlurRGBA(src, w, h, radius) {
  const r = Math.max(1, radius | 0);
  const tmp = new Uint8ClampedArray(src.length);
  const dest = new Uint8ClampedArray(src.length);
  const span = r * 2 + 1;

  for (let y = 0; y < h; y++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) {
        const xx = k < 0 ? 0 : k >= w ? w - 1 : k;
        sum += src[(y * w + xx) * 4 + c];
      }
      for (let x = 0; x < w; x++) {
        tmp[(y * w + x) * 4 + c] = sum / span;
        const leave = x - r < 0 ? 0 : x - r;
        const enter = x + r + 1 >= w ? w - 1 : x + r + 1;
        sum += src[(y * w + enter) * 4 + c] - src[(y * w + leave) * 4 + c];
      }
    }
  }

  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) {
        const yy = k < 0 ? 0 : k >= h ? h - 1 : k;
        sum += tmp[(yy * w + x) * 4 + c];
      }
      for (let y = 0; y < h; y++) {
        dest[(y * w + x) * 4 + c] = sum / span;
        const leave = y - r < 0 ? 0 : y - r;
        const enter = y + r + 1 >= h ? h - 1 : y + r + 1;
        sum += tmp[(enter * w + x) * 4 + c] - tmp[(leave * w + x) * 4 + c];
      }
    }
  }
  return dest;
}

function applyWeakBeauty(data, w, h, opts) {
  const smooth = Math.max(0, Math.min(1, (opts && opts.smooth ? opts.smooth : 0) / 100));
  const whiten = Math.max(0, Math.min(1, (opts && opts.whiten ? opts.whiten : 0) / 100));
  const blemish = Math.max(0, Math.min(1, (opts && opts.blemish ? opts.blemish : 0) / 100));
  if (smooth <= 0 && whiten <= 0 && blemish <= 0) {
    return false;
  }

  const src = new Uint8ClampedArray(data);
  const radius = Math.max(1, Math.round(1 + smooth * 2 + blemish * 1.4));
  const blurred = boxBlurRGBA(src, w, h, radius);
  let changed = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];
    const a = src[i + 3];
    const skin = isSkinTone(r, g, b) ? 1 : 0.22;
    const mix = (smooth * 0.48 + blemish * 0.28) * skin;
    let nr = r * (1 - mix) + blurred[i] * mix;
    let ng = g * (1 - mix) + blurred[i + 1] * mix;
    let nb = b * (1 - mix) + blurred[i + 2] * mix;
    const lift = whiten * 0.24;
    nr += (255 - nr) * lift;
    ng += (255 - ng) * lift * 1.06;
    nb += (255 - nb) * lift * 1.14;
    nr = clamp8(nr);
    ng = clamp8(ng);
    nb = clamp8(nb);
    if (nr !== r || ng !== g || nb !== b) changed += 1;
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
    data[i + 3] = a;
  }
  return changed > 0;
}

module.exports = {
  clamp8,
  isSkinTone,
  boxBlurRGBA,
  applyWeakBeauty
};
