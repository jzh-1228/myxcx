function setEditorSession(session) {
  const app = getApp();
  if (!app.globalData) app.globalData = {};
  app.globalData.editorSession = session || null;
}

function takeEditorSession() {
  const app = getApp();
  const session = (app.globalData && app.globalData.editorSession) || null;
  if (app.globalData) app.globalData.editorSession = null;
  return session;
}

module.exports = {
  setEditorSession,
  takeEditorSession
};
