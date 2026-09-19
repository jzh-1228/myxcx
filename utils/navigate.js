const storage = require('./storage');

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
    persistDraft = true
  } = options || {};

  let id = draftId;
  if (persistDraft && (imagePath || spec) && !draftId) {
    const draft = storage.saveDraft({
      imagePath,
      mode,
      sub,
      specContext: spec || null
    });
    id = draft.id;
  } else if (draftId && imagePath) {
    storage.saveDraft({
      id: draftId,
      imagePath,
      mode,
      sub,
      specContext: spec || null
    });
  }

  const query = buildQuery({
    image: imagePath,
    mode,
    sub,
    draftId: id,
    specId: spec && spec.id,
    specName: spec && spec.name,
    canvasW: spec && spec.width,
    canvasH: spec && spec.height,
    bg: spec && spec.bgColor
  });

  wx.navigateTo({
    url: `/pages/editor/editor${query ? `?${query}` : ''}`
  });
}

module.exports = {
  buildQuery,
  openEditor
};
