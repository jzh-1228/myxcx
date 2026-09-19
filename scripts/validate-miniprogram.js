#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];

function readJson(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    errors.push(`缺少文件: ${rel}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (e) {
    errors.push(`JSON 无法解析: ${rel} (${e.message})`);
    return null;
  }
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const app = readJson('app.json');
readJson('project.config.json');
readJson('sitemap.json');

const requiredRoots = [
  'app.js',
  'app.wxss',
  'project.config.json',
  'sitemap.json',
  'config.js',
  'services/ai.js',
  'services/media.js',
  'services/export.js',
  'services/matting.js',
  'services/matting/hivision.js',
  'services/matting/aliyun.js',
  'services/matting/webhook.js',
  'utils/storage.js',
  'utils/navigate.js',
  'constants/editor.js',
  'constants/specs.js'
];

requiredRoots.forEach((rel) => {
  if (!exists(rel)) errors.push(`缺少文件: ${rel}`);
});

if (app) {
  (app.pages || []).forEach((page) => {
    ['.js', '.json', '.wxml', '.wxss'].forEach((ext) => {
      const rel = `${page}${ext}`;
      if (!exists(rel)) errors.push(`页面缺少 ${rel}`);
    });
  });

  const tabs = (app.tabBar && app.tabBar.list) || [];
  if (tabs.length !== 4) {
    errors.push(`tabBar 应为 4 项，实际 ${tabs.length}`);
  }
  const texts = tabs.map((t) => t.text).join('|');
  if (texts !== '修图|创作|证件照|我的') {
    errors.push(`tabBar 文案应为 修图|创作|证件照|我的，实际 ${texts}`);
  }
  tabs.forEach((tab) => {
    if (!exists(tab.iconPath)) errors.push(`缺少 Tab 图标 ${tab.iconPath}`);
    if (!exists(tab.selectedIconPath)) errors.push(`缺少 Tab 图标 ${tab.selectedIconPath}`);
  });
}

const project = readJson('project.config.json');
if (project && !project.appid) {
  errors.push('project.config.json 缺少 appid');
}

const appInstance = { globalData: { editorSession: null } };
global.wx = {
  env: { USER_DATA_PATH: '/tmp' },
  getStorageSync() {
    return {};
  },
  setStorageSync() {},
  showToast() {},
  showModal() {},
  showLoading() {},
  hideLoading() {},
  navigateTo() {},
  navigateBack() {},
  switchTab() {},
  chooseMedia() {},
  saveImageToPhotosAlbum() {},
  uploadFile() {},
  request() {},
  getFileSystemManager() {
    return {
      writeFile(opts) {
        if (opts && opts.success) opts.success();
      },
      readFile(opts) {
        if (opts && opts.success) opts.success({ data: '' });
      }
    };
  },
  getSystemInfoSync() {
    return { statusBarHeight: 20 };
  },
  getWindowInfo() {
    return { statusBarHeight: 20 };
  }
};
global.App = function App(opts) {
  Object.assign(appInstance, opts || {});
};
global.getApp = function getApp() {
  return appInstance;
};
global.Page = function Page() {};
global.Component = function Component() {};

function walk(dir) {
  fs.readdirSync(dir).forEach((name) => {
    const abs = path.join(dir, name);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.git') return;
      walk(abs);
      return;
    }
    if (!name.endsWith('.js')) return;
    if (name === 'validate-miniprogram.js' || name === 'test-matting.js' || name === 'mock-hivision.js') {
      return;
    }
    try {
      require(abs);
    } catch (e) {
      errors.push(`JS 无法加载: ${path.relative(root, abs)} (${e.message})`);
    }
  });
}

walk(root);

if (errors.length) {
  console.error('校验失败:\n- ' + errors.join('\n- '));
  process.exit(1);
}

console.log('小程序骨架结构校验通过');
console.log(`页面数: ${app.pages.length}`);
console.log(`AppID 占位: ${project.appid}`);
