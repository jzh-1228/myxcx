const ID_SPECS = [
  { id: 'one-inch', name: '一寸', width: 295, height: 413, bgColor: '白', sizeText: '295×413' },
  { id: 'two-inch', name: '二寸', width: 413, height: 579, bgColor: '白', sizeText: '413×579' },
  { id: 'small-two', name: '小二寸', width: 413, height: 531, bgColor: '白', sizeText: '413×531' },
  { id: 'passport', name: '护照', width: 390, height: 567, bgColor: '白', sizeText: '390×567' },
  { id: 'visa', name: '签证', width: 390, height: 567, bgColor: '白', sizeText: '按国家' },
  { id: 'license', name: '驾驶证', width: 260, height: 378, bgColor: '白', sizeText: '260×378' }
];

function findSpec(id) {
  return ID_SPECS.find((item) => item.id === id) || null;
}

function displaySpecName(spec) {
  if (!spec) return '';
  return `${spec.name}${spec.bgColor ? spec.bgColor + '底' : ''}`;
}

module.exports = {
  ID_SPECS,
  findSpec,
  displaySpecName
};
