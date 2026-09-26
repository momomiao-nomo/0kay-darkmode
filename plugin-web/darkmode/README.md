# darkmode — 0KAY 暗夜模式插件

给 0KAY WebUI 加一套完整的深色主题，做成**标准插件**：不动 WebUI 源码，
只靠 `.patch` + 插件原生 ESM 页面（Scheme C）实现。

## 组成

| 文件 | 作用 |
|---|---|
| `plugin-web/darkmode/theme.js` | **主题引擎**：零依赖（无 `import`/`export`，IIFE），可被任意时机加载 |
| `plugin-web/darkmode/index.js` | **外观页**：`import './theme.js'` + 默认导出 Vue 组件 |
| `core/data/plugin-ui/darkmode/{theme,index}.js` | 部署产物，Core 经 `/api/plugins/darkmode/ui/…` 提供 |
| `core/data/ui/darkmode.patch` | UI patch：左侧导航「外观」+ 路由 `/appearance` |
| `manifest.json` / `package.json` / `vite.config.js` | 包与构建约定，与 `plugin-web/skillsguishow` 一致 |

拆成两个文件是有原因的：引导脚本可能早于宿主 Vue 桥（`window.__0KAY_VUE__`）执行，
所以被引导的那份**绝不能 import `vue`**。`theme.js` 无任何依赖，随便什么时候加载都安全；
`index.js` 才是需要宿主 Vue 的页面。

## 构建

```powershell
cd plugin-web/darkmode
npm install
npm run build          # → ../../core/data/plugin-ui/darkmode/index.js
```

两份文件都是合法 ESM（只用裸 `vue` 导入、无 SFC、无 JSX），
所以**不构建也能直接跑**：仓库里已经放了一份拷贝到 `core/data/plugin-ui/darkmode/`。
跑过 `npm run build` 之后 `index.js` 会被打包产物覆盖；`theme.js` 是纯 IIFE，
vite lib 模式不会把它当成入口，改完请手动同步一份。

改了任一文件记得同步两处，并 bump patch 里的 `?v=` 号。

## 生效方式

1. Core 扫描 `core/data/ui/darkmode.patch`，WebUI 取到 nav + router 两条 op。
2. 打开左侧「外观」（或 `/appearance`）→ 路由加载
   `/api/plugins/darkmode/ui/index.js` → 它 `import './theme.js'` 安装引擎。
3. 引擎安装时会：
   - 读 `localStorage['0kay_theme_mode']`（`auto` / `light` / `dark`，默认 `auto`）；
   - 往 `<head>` 注入 `<style id="0kay-darkmode-style">`；
   - 给 `<html>` 设置 `data-theme="dark" | "light"`；
   - `auto` 模式下监听 `prefers-color-scheme` 变化实时切换。
4. 页面上是三张卡片（跟随系统 / 浅色 / 深色），点击即写入偏好并立即生效。

样式表只挂在 `html[data-theme="dark"]` 下，所以可以常驻 `<head>`，
浅色模式完全不受影响；`color-scheme` 同步设置，原生滚动条、表单控件也会跟着变暗。

## 首屏引导（可选，但强烈建议）

插件模块是按需加载的，刷新后要等 `/appearance` 被打开一次才重新应用。
让首屏就是深色，需要在 WebUI 的 `index.html` 里加一段引导。**注意不要写内联 `import()`**：

```html
<!-- Vite 会转换 index.html 里的内联 module script，把它当项目文件解析，
     `import('/api/…')` 会直接报 "Failed to resolve import"。用注入 <script> 绕开。 -->
<script>
  try {
    var m = localStorage.getItem('0kay_theme_mode') || 'auto';
    var dark = m === 'dark' || (m === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch (e) { document.documentElement.dataset.theme = 'light'; }
  (function () {
    var s = document.createElement('script');
    s.type = 'module';
    s.src = '/api/plugins/darkmode/ui/theme.js';
    document.head.appendChild(s);
  })();
</script>
<style>
  html[data-theme="dark"] { color-scheme: dark; background: #14161d; }
  html[data-theme="dark"] body { background: #14161d; color: #e3e6ee; }
</style>
```

同步脚本先把 `data-theme` 定下来（配两条 guard 背景色，消除白闪），
再异步加载引擎覆盖完整 token 表；`<style>` 只是首屏那一瞬间的兜底。

## 主题怎么做的

深色不是另写一套样式，而是**换 token**：覆盖 `--md-*`（MD3 语义色）、
`--neutral-gray-*`（老别名）、`--shadow-*`，以及少量被 WebUI 写死的浅色
（refined 层的 `#f8f9fb`、导航/会话栏、Live2D 舞台渐变、`<select>` 箭头 SVG、
AboutPanel/UsagePage 里硬编码的深色文字等）。

另外补了几个 WebUI 本身没定义的 token（`--md-on-error-container`、
`--md-on-success-container`、`--md-on-warning-container`），这样
`.error-message`、`.danger-box`、`.banner.err` 这类容器文字在深色下也会自动取反。

`auto` 模式冲突也处理了：`settings.css` 里的 `@media (prefers-color-scheme: dark)`
会被 `html[data-theme="light"]` 的显式规则压掉，系统深色 + 手动选浅色不会串味。

## 运行时 API

引擎会挂一个 `window.__0KAY_THEME__`，方便其它插件或控制台调用：

```js
__0KAY_THEME__.getMode()          // 'auto' | 'light' | 'dark'
__0KAY_THEME__.resolved()         // 'light' | 'dark'（auto 已解析）
__0KAY_THEME__.setMode('dark')    // 写入偏好并应用
__0KAY_THEME__.toggle()           // 在浅/深之间切换（会固定为显式模式）
__0KAY_THEME__.install()          // 幂等重装（应用 + 挂媒体查询监听）
```

## 卸载

删掉 `core/data/ui/darkmode.patch` 即可（导航项与路由由 patch 提供），
再顺手删掉 `index.html` 里的引导块。`core/data/plugin-ui/darkmode/` 可以留着，
没有 patch 引用就不会被加载。主题偏好存在 `localStorage['0kay_theme_mode']`，
清掉即恢复跟随系统。
