function stripDataUrl(value) {
  const str = String(value || '').trim();
  const idx = str.indexOf('base64,');
  const raw = idx >= 0 ? str.slice(idx + 7) : str;
  return raw.replace(/\s/g, '');
}

function pickImageBase64(data) {
  if (!data || typeof data !== 'object') return '';
  return (
    data.image_base64 ||
    data.imageBase64 ||
    data.image_base64_hd ||
    data.image_base64_standard ||
    data.matte_base64 ||
    ''
  );
}

function assertHivisionOk(data) {
  if (!data || typeof data !== 'object') {
    return {
      ok: false,
      code: 'MATTING_BAD_RESPONSE',
      message: '抠图服务返回无法识别'
    };
  }
  if (data.status === false || data.status === 'false' || data.status === 0) {
    return {
      ok: false,
      code: 'MATTING_FAILED',
      message: data.error || data.message || '抠图失败：未检测到人脸或服务拒绝'
    };
  }
  const b64 = stripDataUrl(pickImageBase64(data));
  if (!b64) {
    return {
      ok: false,
      code: 'MATTING_BAD_RESPONSE',
      message: '抠图服务未返回图像'
    };
  }
  return { ok: true, base64: b64 };
}

module.exports = {
  stripDataUrl,
  pickImageBase64,
  assertHivisionOk
};
