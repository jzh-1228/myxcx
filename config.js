/**
 * 本地可改配置。不要把密钥写进仓库。
 * 小程序内「我的 → 设置」里的地址会覆盖这里的 matting.baseUrl。
 */
module.exports = {
  matting: {
    provider: 'hivision',
    baseUrl: '',
    timeoutMs: 60000,
    hivision: {
      mattingModel: 'modnet_photographic_portrait_matting'
    },
    aliyun: {
      endpoint: '',
      accessKeyId: '',
      accessKeySecret: ''
    },
    webhook: {
      url: '',
      token: ''
    }
  }
};
