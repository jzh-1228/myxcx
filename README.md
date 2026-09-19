# 最美证件照

微信小程序：**全能修图**（对标醒图信息架构）。「最美证件照」是品牌名；证件照只是挂载在同一套全量编辑器上的规格场景，不是产品边界。

当前版本接入了 **真实人像抠图 + 换底**，以及 **弱美颜**（人像·美肤滑杆会改画布像素）。滤镜 LUT、其它人像细项、AI 写真等仍为桩。

## 在微信开发者工具中预览

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 选择 **导入项目**，目录选本仓库根目录（含 `app.json` / `project.config.json` 的这一层）。
3. **AppID**
   - 默认占位：`touristappid`（见 `project.config.json` 的 `appid` 字段）
   - 本地预览：可用「测试号」
   - 正式上传：把 `appid` 换成你在[微信公众平台](https://mp.weixin.qq.com/)注册的小程序 AppID
4. 基础库建议 **2.10.4+**（工程里写的是 `3.7.0`）。勾选 ES6、增强编译后点编译。
5. 本地调试抠图时，在开发者工具 **详情 → 本地设置** 勾选 **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**。
6. 真机预览需要扫码登录开发者工具；`wx.chooseMedia` / 保存相册 / `wx.uploadFile` 在模拟器与真机权限提示可能不同。

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

从证件照 Tab 选规格 → `wx.chooseMedia` → 同一编辑器注入 `specContext`。若已配置抠图服务，会先走 `/idphoto` + `/add_background` 再进入画布。

## 人像抠图 + 换底（真实管线）

默认 Provider 是 **HivisionIDPhotos 兼容 HTTP**，不绑定云厂商密钥。页面只调用 `services/matting.js` 门面。

### 1. 用 Docker 跑 Hivision API

```bash
docker pull linzeyi/hivision_idphotos
docker run -d -p 8080:8080 linzeyi/hivision_idphotos python3 deploy_api.py
```

服务起来后应能访问 `http://<主机>:8080`。接口约定见 [Hivision API 文档](https://github.com/Zeyi-Lin/HivisionIDPhotos/blob/master/docs/api_CN.md)：

| 路径 | 用途 |
|------|------|
| `POST /human_matting` | RGB → RGBA 透明人像 |
| `POST /add_background` | RGBA + HEX 底色 → 合成图 |
| `POST /idphoto` | 按宽高校准的透明证件照 |

没有 GPU、只想先打通小程序时，可用仓库自带 mock（返回一张真实 RGBA PNG，**不是假成功空响应**）：

```bash
node scripts/mock-hivision.js
# http://127.0.0.1:8080
```

本机 Docker / mock 对**真机**不可达。真机请把服务放到有公网 HTTPS 的机器，或用内网穿透。

### 2. 填写 baseUrl

优先级：**我的 → 设置** 里保存的地址 > 根目录 `config.js` 的 `matting.baseUrl`。

```js
// config.js
matting: {
  provider: 'hivision',
  baseUrl: 'https://your-hivision.example.com'
}
```

或在小程序设置页填 `http://127.0.0.1:8080`（仅开发者工具 + 不校验域名）后点「保存抠图配置」。

未配置时：点「开始抠图 / 换底 / 证件照自动换底」会 **Toast 说明怎么配**，不会静默假成功。

### 3. 合法域名

正式版必须在[微信公众平台](https://mp.weixin.qq.com/) → 开发 → 开发管理 → 开发设置 → **服务器域名** 添加该主机（**HTTPS**）：

- **request 合法域名**
- **uploadFile 合法域名**

开发者工具可勾选「不校验合法域名」走本地 HTTP。

小程序通过 `wx.uploadFile`（字段名 `input_image`）上传临时文件；失败时回退为读取 base64 + `wx.request` 表单字段 `input_image_base64`。

### 4. 建议点检路径（抠图）

1. 设置里填好 baseUrl 并保存。
2. **修图** → 从相册导入 → 编辑器「编辑」→ **抠图** → 开始抠图，画布应变为透明人像（或已带默认底）。
3. 换底色点 **白 / 蓝 / 红 / 自定义 HEX**，画布更新为合成图；顶栏「对比」可看原图。
4. **证件照** → 一寸 → 选图：已配置时先自动抠图并套白底，规格条「底色」会再次请求换底。
5. 清空 baseUrl 后再点抠图：必须出现配置说明 Toast。

### 5. 其它 Provider

| Provider | 行为 |
|----------|------|
| `hivision`（默认） | 真实 HTTP 客户端 |
| `webhook` | 若填了 URL，POST JSON `{ action, imageBase64, color }`，期望返回 `{ status, image_base64 }` |
| `aliyun` | **仅配置位**（`matting.aliyun.endpoint / accessKeyId / accessKeySecret`），不发请求、不放假密钥 |

AI 生成类能力仍走 `services/ai.js` 桩，与抠图 / 美颜 Provider 分开。

## 弱美颜（人像 · 美肤）

默认强度是弱档（约 20–40%）。证件照 / **合规** 再压到上限 35，并显示提示。**美颜模式** 上限 70。

页面只调用 `services/beauty.js`：

| Provider | 行为 |
|----------|------|
| `auto`（默认） | 若有 baseUrl 先试 `POST {baseUrl}/beautify`（可在 `config.js` 改 `beauty.path`）；404 或失败则 **本地轻处理** |
| `local` | 只用离屏 Canvas 2D：肤色区弱磨皮 + 轻度提亮 / 祛瑕混合 |
| `hivision` / `http` | 同上远程接口；字段含 `smooth` / `whiten` / `denoise` 以及 Hivision `/idphoto` 风格的 `whitening_strength` |

本地路径会在画布角标写明 **「本地轻处理」**，并且必须改像素；强度为 0 时提示「未改像素」，不假装成功。

离屏画布不可用且未配置远程时，弹出说明，不会静默假成功。

### 怎么开

1. **不配服务也能用**：微信基础库支持 Canvas 2D 即可拖滑杆看效果。
2. **复用 Hivision**：设置里抠图 `baseUrl` 填好后，美颜会先打 `/beautify`。Hivision 原版没有该接口时自动回退本地。证件照制作仍可用 `/idphoto` 的 `whitening_strength`（弱档映射）。
3. **单独美颜 URL**：`config.js` 的 `beauty.baseUrl` + `beauty.path`，或「我的 → 设置」美颜 baseUrl（覆盖）。
4. 合法域名与抠图相同：把 HTTPS 主机加入 **request** / **uploadFile**。

证件照进入后自动弱美颜 **默认关**，在设置里打开。打开后也只走合规弱预设。

### 建议点检路径（美颜）

1. 修图导入照片 → 人像 · 美肤 → 拖磨皮/美白/祛瑕或点「自然美颜」「应用」，画布应有可见轻变化，角标「本地轻处理」。
2. 切到 **合规**：滑杆上限变低；规格条「过审」也会切到合规。
3. 撤销 / 重做应回到上一张处理图。
4. 证件照：默认不自动美颜；在设置打开后再走一寸，结果应略弱于美颜模式。

## 目录

```
config.js              抠图 baseUrl / Provider（无密钥）
app.js / app.json / app.wxss
project.config.json    AppID 占位 touristappid
pages/
components/
utils/                 含 matting-config、本地文件、编辑器 session
services/matting.js    抠图门面
services/matting/      hivision / webhook / aliyun / parse
services/beauty.js     弱美颜门面
services/beauty/       local canvas / http / 纯像素算法
services/ai.js         AI 生成桩（厂商无关）
constants/
scripts/mock-hivision.js
scripts/test-matting.js
```

## 桩 vs 真实能力

| 能力 | 当前 | 后续怎么接 |
|------|------|------------|
| 相册 / 拍照 | `wx.chooseMedia` 真实调用 | 保持 |
| 人像抠图 / 换底（白蓝红/自定义） | `services/matting.js` → Hivision HTTP | 可换 webhook / 自实现 aliyun |
| 证件照自动换底 | 选图后 `/idphoto` + `/add_background` | 保持规格条换底 |
| 画布 / 对比 | 展示合成图；对比显示原图 | — |
| 最近草稿 / 作品 | `wx.setStorageSync` 本地 | 可换云端 |
| 人像·美肤 磨皮/美白/祛瑕 | 弱美颜真实改像素（本地轻处理，可选 /beautify） | 美型/妆容等仍为桩 |
| 其它人像滑杆 / 滤镜 / 其它编辑工具 | **仅 UI** | 算法另接 |
| AI 写真 / 造型室 / 超清 / 扩图 | `services/ai.js` 桩 | 只改 service，页面不写死厂商 |
| 撤销重做 | 含抠图结果路径的状态栈 | — |
| 保存相册 | 有图则 `wx.saveImageToPhotosAlbum` | — |
| 高清导出 / 分享 | Toast 桩 | 接超分与分享图 |
| 会员 / 支付 | 「我的」占位 | 不在本期 |
| Live / 视频 | 未做 | backlog |

## 建议点检路径（壳）

1. 启动落在 **修图** Tab；底栏可切到创作 / 证件照 / 我的。
2. 修图：相册或拍照 → 进入编辑器（默认人像 · 美肤滑杆）。
3. 编辑器底栏切到滤镜 / 编辑 / 创作 / AI；人像美肤与编辑 → 抠图为真实管线，其余工具仍为桩。
4. 证件照：搜索或点「一寸」→ 选图 → 规格条可折叠，底栏仍是五态。
5. 我的：作品 / 草稿 / 设置 / 隐私可进；设置可保存抠图地址。

## 本地校验

```bash
node scripts/validate-miniprogram.js
node scripts/test-matting.js
node scripts/test-beauty.js
```

结构校验 + 抠图解析 + 弱美颜像素/合规帽。不能替代微信开发者工具编译与真机点检。
