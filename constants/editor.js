const EDITOR_MODES = [
  { id: 'portrait', name: '人像' },
  { id: 'filter', name: '滤镜' },
  { id: 'edit', name: '编辑' },
  { id: 'create', name: '创作' },
  { id: 'ai', name: 'AI' }
];

const PORTRAIT_CHIPS = [
  {
    id: 'skin',
    name: '美肤',
    sliders: [
      { key: 'smooth', label: '磨皮', value: 55 },
      { key: 'whiten', label: '美白', value: 40 },
      { key: 'blemish', label: '祛瑕', value: 30 }
    ]
  },
  {
    id: 'reshape',
    name: '美型',
    sliders: [
      { key: 'face', label: '脸型', value: 20 },
      { key: 'eye', label: '眼睛', value: 15 },
      { key: 'nose', label: '鼻子', value: 10 }
    ]
  },
  {
    id: 'makeup',
    name: '妆容',
    sliders: [
      { key: 'lipstick', label: '口红', value: 35 },
      { key: 'blush', label: '腮红', value: 20 },
      { key: 'eyeshadow', label: '眼影', value: 25 }
    ]
  },
  {
    id: 'hair',
    name: '头发',
    sliders: [
      { key: 'color', label: '发色', value: 0 },
      { key: 'flyaway', label: '祛碎发', value: 20 }
    ]
  },
  {
    id: 'body',
    name: '美体',
    sliders: [
      { key: 'slim', label: '瘦身', value: 15 },
      { key: 'posture', label: '体态', value: 10 }
    ]
  },
  {
    id: 'light',
    name: '光影',
    sliders: [
      { key: 'stereo', label: '立体', value: 30 },
      { key: 'highlight', label: '高光', value: 25 }
    ]
  },
  {
    id: 'local',
    name: '局部',
    sliders: [
      { key: 'brush', label: '笔刷', value: 50 }
    ]
  }
];

const FILTERS = [
  { id: 'none', name: '原图' },
  { id: 'fresh', name: '清新' },
  { id: 'film', name: '胶片' },
  { id: 'jp', name: '日系' },
  { id: 'hk', name: '港风' },
  { id: 'bw', name: '黑白' }
];

const EDIT_TOOLS = [
  { id: 'crop', name: '裁剪' },
  { id: 'adjust', name: '调节' },
  { id: 'remove', name: '消除' },
  { id: 'matting', name: '抠图' },
  { id: 'blur', name: '虚化' },
  { id: 'canvas', name: '画布' },
  { id: 'mosaic', name: '马赛克' }
];

const ADJUST_SLIDERS = [
  { key: 'brightness', label: '亮度', value: 50 },
  { key: 'contrast', label: '对比', value: 50 },
  { key: 'saturate', label: '饱和', value: 50 }
];

const CREATE_TOOLS = [
  { id: 'template', name: '模板' },
  { id: 'sticker', name: '贴纸' },
  { id: 'text', name: '文字' },
  { id: 'collage', name: '拼图' }
];

const CREATE_TEMPLATES = [
  { id: 'tpl-1', name: '模板1' },
  { id: 'tpl-2', name: '模板2' },
  { id: 'tpl-3', name: '模板3' },
  { id: 'tpl-4', name: '模板4' }
];

const AI_CAPABILITIES = [
  { id: 'generatePortrait', name: 'AI写真' },
  { id: 'stylingRoom', name: '造型室' },
  { id: 'instructEdit', name: '一句话修图' },
  { id: 'referenceEdit', name: '参考图' },
  { id: 'enhance', name: '超清' },
  { id: 'outpaint', name: '扩图' }
];

const SHORTCUTS = [
  { id: 'beauty', name: '一键美颜', icon: '美颜', mode: 'portrait', sub: 'skin' },
  { id: 'remove', name: '消除', icon: '消', mode: 'edit', sub: 'remove' },
  { id: 'matting', name: '抠图', icon: '抠', mode: 'edit', sub: 'matting' },
  { id: 'enhance', name: '超清', icon: '清', mode: 'ai', sub: 'enhance' },
  { id: 'portrait', name: 'AI写真', icon: 'AI', mode: 'ai', sub: 'generatePortrait' }
];

const BG_COLORS = ['白', '蓝', '红'];

module.exports = {
  EDITOR_MODES,
  PORTRAIT_CHIPS,
  FILTERS,
  EDIT_TOOLS,
  ADJUST_SLIDERS,
  CREATE_TOOLS,
  CREATE_TEMPLATES,
  AI_CAPABILITIES,
  SHORTCUTS,
  BG_COLORS
};
