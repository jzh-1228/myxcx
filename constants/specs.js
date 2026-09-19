const ID_SPECS = [
  { id: 'one-inch', name: '一寸', width: 295, height: 413, mmWidth: 25, mmHeight: 35, bgColor: '白', sizeText: '295×413 · 25×35mm' },
  { id: 'two-inch', name: '二寸', width: 413, height: 579, mmWidth: 35, mmHeight: 49, bgColor: '白', sizeText: '413×579 · 35×49mm' },
  { id: 'small-two', name: '小二寸', width: 413, height: 531, mmWidth: 35, mmHeight: 45, bgColor: '白', sizeText: '413×531 · 35×45mm' },
  { id: 'passport', name: '护照', width: 390, height: 567, mmWidth: 33, mmHeight: 48, bgColor: '白', sizeText: '390×567 · 33×48mm' },
  { id: 'visa', name: '签证', width: 390, height: 567, mmWidth: 33, mmHeight: 48, bgColor: '白', sizeText: '390×567 · 按国家' },
  { id: 'license', name: '驾驶证', width: 260, height: 378, mmWidth: 22, mmHeight: 32, bgColor: '白', sizeText: '260×378 · 22×32mm' }
];

function findSpec(id) {
  return ID_SPECS.find((item) => item.id === id) || null;
}

function displaySpecName(spec) {
  if (!spec) return '';
  return `${spec.name}${spec.bgColor ? spec.bgColor + '底' : ''}`;
}

function specPixelText(spec) {
  if (!spec || !spec.width || !spec.height) return '';
  if (spec.mmWidth && spec.mmHeight) {
    return `${spec.width}×${spec.height}px（约 ${spec.mmWidth}×${spec.mmHeight}mm）`;
  }
  return spec.sizeText || `${spec.width}×${spec.height}px`;
}

module.exports = {
  ID_SPECS,
  findSpec,
  displaySpecName,
  specPixelText
};
