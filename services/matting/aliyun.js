/**
 * 阿里云视觉智能 SegmentBody 配置位。
 * 不内置密钥、不发假成功。接入时保持函数签名即可。
 */
const { getMattingConfig } = require('../../utils/matting-config');

function rejectStub() {
  const cfg = getMattingConfig();
  const endpoint = (cfg.aliyun && cfg.aliyun.endpoint) || '';
  return Promise.reject({
    code: 'MATTING_PROVIDER_STUB',
    message: endpoint
      ? '阿里云 SegmentBody 仅预留 endpoint / accessKeyId / accessKeySecret，尚未实现请求。请改用 hivision，或自行实现 services/matting/aliyun.js。'
      : '阿里云 SegmentBody 为桩。请在 config.js 的 matting.aliyun 填写 endpoint 等配置键后自行实现，或改用 hivision。'
  });
}

module.exports = {
  id: 'aliyun',
  matte: rejectStub,
  addBackground: rejectStub,
  idPhoto: rejectStub
};
