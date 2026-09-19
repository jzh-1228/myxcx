# 最美证件照

微信小程序骨架：**全能修图**（对标醒图信息架构）。「最美证件照」是品牌名；证件照只是挂载在同一套全量编辑器上的规格场景，不是产品边界。

本仓库当前交付的是 **MVP / skeleton**：四 Tab + 一壳多态编辑器 + 证件照挂载路径可跑通。美颜、抠图、滤镜算法和 AI 厂商均未接入。

## 在微信开发者工具中预览

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 选择 **导入项目**，目录选本仓库根目录（含 `app.json` / `project.config.json` 的这一层）。
3. **AppID**
   - 默认占位：`touristappid`（见 `project.config.json` 的 `appid` 字段）
   - 本地预览：可用「测试号」
   - 正式上传：把 `appid` 换成你在[微信公众平台](https://mp.weixin.qq.com/)注册的小程序 AppID
4. 基础库建议 **2.10.4+**（工程里写的是 `3.7.0`）。勾选 ES6、增强编译后点编译。
5. 真机预览需要扫码登录开发者工具；`wx.chooseMedia` / 保存相册在模拟器与真机权限提示可能不同。

不需要 `npm install`。这是原生小程序（WXML + WXSS + JS + JSON），没有构建步骤。

## 信息架构（对标线框 A–K）

| Tab / 页 | 线框 | 路径 |
|----------|------|------|
| 修图（默认首页） | A | `pages/retouch/retouch` |
| 创作 | G | `pages/create/create` |
| 证件照 | H | `pages/idphoto/idphoto` |
| 我的 | K | `pages/mine/mine` |
| 全量编辑器（一壳多态） | B–F / I | `pages/editor/editor` |
| 导出 Sheet | J | 编辑器内 `export-sheet` |
| 作品 / 草稿 / 设置 / 隐私 | K 子页 | `pages/works` `pages/drafts` `pages/settings` `pages/privacy` |

编辑器底栏（醒图同构）：**人像 | 滤镜 | 编辑 | 创作 | AI**。顶栏与画布共用，切换只换底部 Sheet。

从证件照 Tab 选规格 → `wx.chooseMedia` → 打开同一编辑器并注入 `specContext`，顶部出现可折叠规格条（线框 I）。

## 目录

```
app.js / app.json / app.wxss
project.config.json    AppID 占位 touristappid
sitemap.json
pages/                 页面
components/            滑杆 / 规格条 / 导出 Sheet / 占位图
utils/                 本地存储、跳转、格式化
services/              AI / 选图 / 导出（AI 为桩）
constants/             编辑器模式、规格库
assets/tab/            TabBar 图标
```

## 桩 vs 真实能力

| 能力 | 当前 | 后续怎么接 |
|------|------|------------|
| 相册 / 拍照 | `wx.chooseMedia` 真实调用 | 保持 |
| 画布展示所选图 | 有路径则 `<image>`，否则占位 | 接入渲染管线 |
| 最近草稿 / 作品 | `wx.setStorageSync` 本地桩 | 可换云端 |
| 人像滑杆 / 滤镜缩略图 / 编辑工具格 | **仅 UI**，无美颜、无 LUT、无抠图算法 | 在编辑器状态上挂渲染 |
| AI 写真 / 造型室 / 超清 / 扩图等 | `services/ai.js` **厂商无关 stub**，统一 `AI_STUB_NOT_WIRED` | 只改 service 实现，不要在页面写死供应商 |
| 对比 / 撤销重做 | 状态栈桩 | 接图层/原图 |
| 保存相册 | 有图则 `wx.saveImageToPhotosAlbum` | 导出前可接超分 |
| 高清导出 / 分享 | Toast 桩 | 接超分与分享图 |
| 另存证件照 | 有规格则提示校验桩；无规格则回证件照 Tab | 接 KB / 排版 |
| 会员 / 支付 | 「我的」占位 | 不在本期 |
| Live / 视频 | 未做 | backlog |

接入 AI 时：保持 `services/ai.js` 的函数签名（`generatePortrait`、`stylingRoom`、`instructEdit`、`referenceEdit`、`enhance`、`outpaint`、`styleTransfer` 等），不要把厂商 SDK 写进页面。

## 建议点检路径

1. 启动落在 **修图** Tab；底栏可切到创作 / 证件照 / 我的。
2. 修图：相册或拍照 → 进入编辑器（默认人像 · 美肤滑杆）。
3. 编辑器底栏切到滤镜 / 编辑 / 创作 / AI，底部 Sheet 应跟着变；顶栏导出打开 Sheet。
4. 证件照：搜索或点「一寸」→ 选图 → 编辑器顶部出现规格条，可折叠，底栏仍是五态。
5. 我的：作品 / 草稿 / 设置 / 隐私可进；开通会员为占位 Toast。

## 本地结构校验（可选）

```bash
node scripts/validate-miniprogram.js
```

检查 `app.json` 页面四件套、Tab 图标和 JSON 是否可解析。不能替代微信开发者工具编译。
