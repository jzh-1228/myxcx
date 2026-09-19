const KEYS = require('../constants/storage-keys');
const { uid } = require('./format');

function readList(key) {
  try {
    const value = wx.getStorageSync(key);
    return Array.isArray(value) ? value : [];
  } catch (e) {
    return [];
  }
}

function writeList(key, list) {
  wx.setStorageSync(key, list);
}

function listDrafts() {
  return readList(KEYS.DRAFTS).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function getDraft(id) {
  return listDrafts().find((item) => item.id === id) || null;
}

function saveDraft(partial) {
  const list = listDrafts();
  const now = Date.now();
  let next;
  if (partial.id) {
    const index = list.findIndex((item) => item.id === partial.id);
    if (index >= 0) {
      next = Object.assign({}, list[index], partial, { updatedAt: partial.updatedAt || now });
      list[index] = next;
    }
  }
  if (!next) {
    next = Object.assign(
      {
        id: uid('draft'),
        imagePath: '',
        mode: 'portrait',
        sub: '',
        specContext: null,
        seeded: false
      },
      partial,
      { updatedAt: partial.updatedAt || now }
    );
    list.unshift(next);
  }
  writeList(KEYS.DRAFTS, list.slice(0, 40));
  return next;
}

function removeDraft(id) {
  writeList(
    KEYS.DRAFTS,
    listDrafts().filter((item) => item.id !== id)
  );
}

function listWorks() {
  return readList(KEYS.WORKS).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function saveWork(partial) {
  const list = listWorks();
  const item = Object.assign(
    {
      id: uid('work'),
      imagePath: '',
      specContext: null,
      createdAt: Date.now()
    },
    partial
  );
  list.unshift(item);
  writeList(KEYS.WORKS, list.slice(0, 40));
  return item;
}

const DEFAULT_SETTINGS = {
  exportQuality: 'standard',
  mattingProvider: '',
  mattingBaseUrl: '',
  mattingWebhookUrl: '',
  autoMatteIdPhoto: true
};

function getSettings() {
  try {
    return Object.assign({}, DEFAULT_SETTINGS, wx.getStorageSync(KEYS.SETTINGS) || {});
  } catch (e) {
    return Object.assign({}, DEFAULT_SETTINGS);
  }
}

function saveSettings(partial) {
  const next = Object.assign({}, getSettings(), partial);
  wx.setStorageSync(KEYS.SETTINGS, next);
  return next;
}

function ensureSeedDrafts() {
  const seeded = wx.getStorageSync(KEYS.SEED_FLAG);
  if (seeded) return;
  const now = Date.now();
  const seeds = [
    { id: 'seed-1', seeded: true, updatedAt: now - 10 * 60 * 1000 },
    { id: 'seed-2', seeded: true, updatedAt: now - 26 * 60 * 60 * 1000 },
    { id: 'seed-3', seeded: true, updatedAt: now - 2 * 24 * 60 * 60 * 1000 }
  ];
  if (!listDrafts().length) {
    writeList(KEYS.DRAFTS, seeds);
  }
  wx.setStorageSync(KEYS.SEED_FLAG, 1);
}

module.exports = {
  listDrafts,
  getDraft,
  saveDraft,
  removeDraft,
  listWorks,
  saveWork,
  getSettings,
  saveSettings,
  ensureSeedDrafts
};
