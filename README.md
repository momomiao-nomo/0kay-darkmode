# 0kay-darkmode

0KAY WebUI 的暗夜模式插件。不改 0KAY 源码，通过一份 UI patch 加一个原生 ESM 面板实现。

外观面板内嵌在 **设置 → 外观**（`settings` op 的 `module`），不再注册侧边栏入口与
`/appearance` 路由。切换深浅色时整页颜色做 560ms 的渐变过渡，并叠一层目标主题色的
径向渐变洗屏，避免硬切闪变（尊重 `prefers-reduced-motion`）。

提供四种模式：跟随系统 / 浅色 / 深色 / 按时段，偏好保存在浏览器 `localStorage`。
「跟随系统」随操作系统的深浅色设置切换；「按时段」在指定时间段内自动切换，默认深色时段
19:00–07:00，可在设置里改。

实现上没有另写一套样式，而是覆盖 MD3 的 CSS 变量（`--md-*`、`--neutral-gray-*`、`--shadow-*`），
所以宿主只要继续用这些变量，切主题就不会大面积漏改。

## 安装

按 0KAY 插件 API（v1）打包。`manifest.json` 用 `ui` 字段声明构建与发布方式，并用 `patches`
字段声明要随安装一起部署到 `CORE_DATA_DIR/ui/` 的 patch（设置里的外观入口与全局主题引擎都靠它，
Core 从 `CORE_DATA_DIR/ui/*.patch` 读取）。

0KAY-pm 支持第三方包：非内置的包名会先查 npm registry 的 `repository` 字段，否则按
`github.com/<owner>/<repo>` 约定解析。所以这里用跟 GitHub 仓库 owner 一致的
`@momomiao-nomo/0kay-darkmode`，pm 就能自己找到仓库、构建页面、把产物发布到
`CORE_DATA_DIR/plugin-ui/darkmode/` 并部署 patch，一行装好：

```powershell
0kay-pm install @momomiao-nomo/0kay-darkmode
```

> 需要支持「第三方包解析 + patch 自动部署」的 0KAY-pm（GitHub `main` 分支 / 后续带该能力的发行版）。
> 装好不用重启：Core 收到 `/api/ui/patches` 请求时会重扫 patch 目录（3 秒节流），WebUI 每 15 秒轮询一次。

> 上架插件市场：给 GitHub 仓库 `momomiao-nomo/0kay-darkmode` 加上 **Topics** `0kay-plugin`（仓库 → Settings → Topics）。市场靠这个 topic 发现插件，**不读 manifest** 里的任何字段（manifest 里的 `repository` 只用于市场详情链接和已装列表回显）。

## 手动安装（仅当 pm 还没收录此包时）

源码本身是可直跑的 ESM，构建只是把两个文件拷进 `dist/`。不走 pm 时，产物和 patch 都要手动放到位：

```powershell
git clone https://github.com/momomiao-nomo/0kay-darkmode.git
cd 0kay-darkmode

# 1) 构建页面（只需 node，不需要 npm install）
cd plugin-web\darkmode
node build.mjs                 # -> dist/index.js、dist/theme.js
cd ..\..

# 2) 发布到 0KAY 的安装目录 <OKAY>（下面两条等价于 pm 的 ui 发布 + patch 部署）
Copy-Item plugin-web\darkmode\dist\*  <OKAY>\core\data\plugin-ui\darkmode\  -Force
Copy-Item core\data\ui\darkmode.patch  <OKAY>\core\data\ui\darkmode.patch  -Force
```

## 自动应用（纯插件，不碰宿主源码）

patch 里有一条 `target: "bootstrap"` 记录：宿主 WebUI 启动时会 `import` `theme.js` 并调用它导出的
`install()`，保存的主题因此在每个页面都自动生效——**整个过程不改动宿主任何源码**，主题引擎只是往
`<head>` 注入一段 `<style>` 覆盖 MD3 的 `--md-*` / `--shadow-*` 变量，并在切换时短暂加上
`html.0kay-theme-fade`（颜色过渡）与一个 `#0kay-theme-wipe` 径向渐变层。

偏好存在浏览器 `localStorage['0kay_theme_mode']`（按时段模式另有 `0kay_theme_schedule`），
所以**刷新页面后主题依然在**：每次启动 bootstrap 模块都会重新 `import` 并 `install()`，从 localStorage
读回模式，`<html data-theme>` 随即恢复，无需手动切回。

（可选，非必须）首屏防闪白：纯插件部署下，刷新瞬间可能极短暂地闪一下浅色，再被 bootstrap 切到深色。
若接受这一点，上面这套就够了。若想彻底无闪白，可手动在 `<OKAY>\webui\index.html` 的 `</head>` 前加一段
同步设 `data-theme` 的内联脚本（只设背景色、不 load 引擎）——但这属于安装时的手动步骤，**不在插件包内**，
纯插件方案可以不做。

## 卸载

```powershell
Remove-Item <OKAY>\core\data\ui\darkmode.patch
```

设置里的外观入口与全局主题引擎都由 patch 提供，删掉即消失。`core/data/plugin-ui/darkmode/` 可以
保留，没有 patch 引用就不会被加载。主题偏好在 `localStorage['0kay_theme_mode']`，清除后回到跟随系统。

## 构建

`plugin-web/darkmode/` 下的源文件（`index.js`、`theme.js`）本身就是浏览器可直接加载的 ESM，
`build.mjs` 只把它们复制到 `dist/`：

```powershell
cd plugin-web\darkmode
node build.mjs        # 输出 dist/index.js、dist/theme.js
```

不需要 `npm install`：`index.js` 里 `import { … } from 'vue'` 的 `vue` 由宿主 WebUI 的
importmap 在运行时映射到宿主桥（`window.__0KAY_VUE__`），打包阶段不依赖它。

改完源码后，`pm install`（或上面的手动步骤）会重新构建 `dist/` 并发布。若浏览器命中旧缓存，
把 `core/data/ui/darkmode.patch` 里 settings 的 `index.js`（或 bootstrap 的 `theme.js`）那条的
`?v=` 加一即可。

## 目录

```text
manifest.json                         包身份 + ui 构建/发布配置（0kay-pm 读取）
plugin-web/darkmode/
  index.js                            外观面板（原生 Vue ESM，默认导出组件，内嵌到设置）
  theme.js                            主题引擎 + 渐变过渡（零依赖 IIFE）
  build.mjs                           构建：把两个源文件拷进 dist/
  package.json
core/data/ui/darkmode.patch           UI patch（bootstrap 全局引擎 + settings 外观面板），由 pm 随安装自动部署到 CORE_DATA_DIR/ui/
```

### 为什么拆成两个文件

引导脚本可能在宿主 Vue 桥就位之前执行。模块里一旦 `import { h } from 'vue'` 失败，整个模块
就加载不出来，主题随之失效。所以被引导的 `theme.js` 不依赖任何模块（内部是零依赖 IIFE，只在
末尾 `export` 一个 `install()`），可以在任意时机安全加载；只有 `index.js` 依赖宿主 Vue。

## 浏览器 API

引擎挂在 `window.__0KAY_THEME__`：

```js
__0KAY_THEME__.getMode()          // 'auto' | 'light' | 'dark' | 'schedule'
__0KAY_THEME__.resolved()         // 'light' | 'dark'（auto/schedule 已解析）
__0KAY_THEME__.setMode('dark')    // 写偏好并应用
__0KAY_THEME__.toggle()           // 浅色/深色切换
__0KAY_THEME__.getSchedule()      // { darkFrom: '19:00', darkUntil: '07:00' }
__0KAY_THEME__.setSchedule({ darkFrom: '20:00', darkUntil: '06:30' })
__0KAY_THEME__.install()          // 幂等重装
```

## 兼容性与已知问题

所有覆盖规则都挂在 `html[data-theme="dark"]` 下，即便 WebUI 之后改了类名或 token，影响也
仅限于局部，不会破坏浅色模式。

配色按 0KAY 当前 `refined` 主题（`--md-primary: #4d5d91`）调。除 token 外，还覆盖了 WebUI 里
几处写死的颜色：refined 层灰底、导航栏与会话栏、Live2D 舞台渐变、`<select>` 箭头 SVG，以及
AboutPanel / UsagePage 里写死的容器文字色；并补了 `--md-on-error-container` /
`--md-on-success-container` / `--md-on-warning-container` 三个宿主未定义的变量，否则深色下这些
容器文字对比度不足。
