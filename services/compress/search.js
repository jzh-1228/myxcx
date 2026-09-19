const {
  MIN_QUALITY,
  MAX_QUALITY,
  QUALITY_GAP,
  QUALITY_ITERS,
  MIN_TARGET_KB,
  MAX_TARGET_KB
} = require('../../constants/export');

function bytesToKb(bytes) {
  return Math.round(((Number(bytes) || 0) / 1024) * 10) / 10;
}

function kbToBytes(kb) {
  return Math.round((Number(kb) || 0) * 1024);
}

function formatKb(kb) {
  const n = Number(kb);
  if (!n && n !== 0) return '—';
  return Number.isInteger(n) ? `${n}KB` : `${n}KB`;
}

function parseTargetKb(input) {
  const n = Number(String(input == null ? '' : input).replace(/[^\d.]/g, ''));
  if (!n || n < MIN_TARGET_KB) return 0;
  return Math.min(MAX_TARGET_KB, Math.round(n));
}

function shouldKeepPng(opts) {
  const o = opts || {};
  return !!(o.needAlpha || (o.hasMatte && !o.bgHex));
}

function midQuality(low, high) {
  return Number(((low + high) / 2).toFixed(3));
}

function qualityPercent(quality) {
  if (quality == null || Number.isNaN(Number(quality))) return '';
  return `${Math.round(Number(quality) * 100)}%`;
}

function betterUnder(a, b) {
  if (!a) return b;
  if (!b) return a;
  return b.quality > a.quality ? b : a;
}

function smallerFile(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (b.bytes !== a.bytes) return b.bytes < a.bytes ? b : a;
  return b.quality >= a.quality ? b : a;
}

function searchQuality(targetBytes, measure, options) {
  const opts = options || {};
  const minQ = opts.minQuality == null ? MIN_QUALITY : opts.minQuality;
  const maxQ = opts.maxQuality == null ? MAX_QUALITY : opts.maxQuality;
  const maxIter = opts.maxIter == null ? QUALITY_ITERS : opts.maxIter;
  const minGap = opts.minGap == null ? QUALITY_GAP : opts.minGap;
  const target = Number(targetBytes) || 0;

  const run = (quality) =>
    Promise.resolve(measure(quality)).then((measured) => {
      const row = measured || {};
      return {
        bytes: Number(row.bytes) || 0,
        quality: row.quality == null ? quality : row.quality,
        filePath: row.filePath || '',
        format: row.format || 'jpeg'
      };
    });

  const attempts = [];

  return run(maxQ).then((first) => {
    attempts.push(first);
    if (!target || first.bytes <= target) {
      return {
        result: first,
        metTarget: !target || first.bytes <= target,
        bestEffort: false,
        attempts
      };
    }

    let low = minQ;
    let high = maxQ;
    let bestUnder = null;
    let smallest = first;
    let i = 0;

    function step() {
      if (i >= maxIter || high - low < minGap) {
        return Promise.resolve();
      }
      i += 1;
      const q = midQuality(low, high);
      return run(q).then((measured) => {
        attempts.push(measured);
        smallest = smallerFile(smallest, measured);
        if (measured.bytes <= target) {
          bestUnder = betterUnder(bestUnder, measured);
          low = q;
        } else {
          high = q;
        }
        return step();
      });
    }

    return step().then(() => {
      if (bestUnder || smallest.quality <= minQ + 0.01) {
        return finish(bestUnder, smallest);
      }
      return run(minQ).then((minR) => {
        attempts.push(minR);
        smallest = smallerFile(smallest, minR);
        if (minR.bytes <= target) bestUnder = betterUnder(bestUnder, minR);
        return finish(bestUnder, smallest);
      });
    });
  });

  function finish(bestUnder, smallest) {
    if (bestUnder) {
      return {
        result: bestUnder,
        metTarget: true,
        bestEffort: false,
        attempts
      };
    }
    return {
      result: smallest,
      metTarget: false,
      bestEffort: true,
      attempts
    };
  }
}

module.exports = {
  bytesToKb,
  kbToBytes,
  formatKb,
  parseTargetKb,
  shouldKeepPng,
  midQuality,
  qualityPercent,
  searchQuality
};
