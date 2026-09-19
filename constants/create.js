const CREATE_FEATURES = [
  {
    id: 'ai-portrait',
    name: 'AI写真',
    sub: '一键生成形象照',
    mode: 'ai',
    capability: 'generatePortrait'
  },
  {
    id: 'styling',
    name: '造型室',
    sub: '换装 / 发型 / 场景',
    mode: 'ai',
    capability: 'stylingRoom'
  },
  {
    id: 'style',
    name: '风格迁移',
    sub: '参考图驱动',
    mode: 'ai',
    capability: 'styleTransfer'
  },
  {
    id: 'templates',
    name: '模板中心',
    sub: '进入编辑器·创作',
    mode: 'create',
    capability: ''
  }
];

const HOT_TEMPLATES = [
  { id: 'hot-a', name: '模板A' },
  { id: 'hot-b', name: '模板B' },
  { id: 'hot-c', name: '模板C' }
];

module.exports = {
  CREATE_FEATURES,
  HOT_TEMPLATES
};
