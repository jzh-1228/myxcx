const storage = require('./storage');
const { setEditorSession } = require('./session');

function buildQuery(params) {
  return Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

function openEditor(options) {
  const {
    imagePath = '',
    mode = 'portrait',
    sub = '',
    spec = null,
    draftId = '',
    persistDraft = true,
    sourcePath = '',
    mattePath = '',
    bgHex = '',
    autoMatte = false,
    autoBeauty = false,
    beautyBasePath = '',
    beautyLabel = ''
  } = options || {};

  let id = draftId;
  const draftFields = {
    imagePath,
    sourcePath: sourcePath || imagePath,
    mattePath,
    bgHex,
    beautyBasePath,
    beautyLabel,
    mode,
    sub,
    specContext: spec || null
  };
  if (persistDraft && (imagePath || spec) && !draftId) {
    const draft = storage.saveDraft(draftFields);
    id = draft.id;
  } else if (draftId) {
    storage.saveDraft(Object.assign({ id: draftId }, draftFields));
  }

  setEditorSession({
    sourcePath: sourcePath || imagePath,
    mattePath,
    imagePath,
    bgHex,
    autoMatte,
    autoBeauty,
    beautyBasePath,
    beautyLabel
  });

  const query = buildQuery({
    image: imagePath,
    mode,
    sub,
    draftId: id,
    specId: spec && spec.id,
    specName: spec && spec.name,
    canvasW: spec && spec.width,
    canvasH: spec && spec.height,
    bg: spec && spec.bgColor,
    autoMatte: autoMatte ? '1' : '',
    autoBeauty: autoBeauty ? '1' : ''
  });

  wx.navigateTo({
    url: `/pages/editor/editor${query ? `?${query}` : ''}`
  });
}

module.exports = {
  buildQuery,
  openEditor
};
