# 0kay-darkmode

[![0kay-plugin](https://img.shields.io/badge/topic-0kay--plugin-4d5d91)](https://github.com/topics/0kay-plugin)

0KAY WebUI 的**暗夜模式**插件。不改 0KAY 源码，只靠一份 UI patch + 一个插件原生
ESM 页面（Scheme C）实现，符合 [0KAY Plugin API](https://razuresoft.github.io/0KAY/PLUGIN_API.html)。

- 三种模式：**跟随系统 / 浅色 / 深色**，偏好存 `localStorage`
- `跟随系统` 会实时响应操作系统的深浅色切换
- 换的是 MD3 token（`--md-*` / `--neutral-gray-*` / `--shadow-*`），不是另写一套样式
- 顺手修掉 WebUI 里写死的浅色（refined 层灰底、导航/会话栏、Live2D 舞台渐变、`<select>` 箭头、若干容器文字色）
- 同步设置 `color-scheme`，原生滚动条与表单控件一起变暗

## 安装

仓库是一棵**分发树**：目录结构与 0KAY 主仓库一一对应，直接拷贝即可。

```powershell
git clone https://github.com/momomiao-nomo/0kay-darkmode.git
cd 0kay-darkmode

# 假设 0KAY 装在 <OKAY>
Copy-Item plugin-web\darkmode           <OKAY>\plugin-web\darkmode           -Recurse -Force
Copy-Item core\data\ui\darkmode.patch   <OKAY>\core\data\ui\darkmode.patch   -Force
Copy-Item core\data\plugin-ui\darkmode  <OKAY>\core\data\plugin-ui\darkmode  -Recurse -Force
```

`core/data/plugin-ui/darkmode/` 里已经带了构建好的 ESM，**不需要 npm 就能用**。
Core 每 3 秒（有请求时）重扫 `core/data/ui/*.patch`，WebUI 每 15 秒轮询一次，
所以放好文件后不用重启服务。

### 首屏引导（可选，但强烈建议）

插件模块是按需加载的，刷新后要等 `/appearance` 被打开一次才会重新应用。
让首屏就是深色，在 `<OKAY>/webui/index.html` 的 `</head>` 前加：

```html
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

⚠️ **不要写成内联 `import('/api/…')`**。Vite 会把 `index.html` 里的内联 module script
抽成虚拟模块做静态分析，`/api/…` 是运行时地址，会直接报
`[plugin:vite:import-analysis] Failed to resolve import`。用注入 `<script>` 绕开。

同步脚本先把 `data-theme` 定下来（配两条 guard 背景色消除白闪），再异步加载引擎覆盖完整 token 表。

## 卸载

```powershell
Remove-Item <OKAY>\core\data\ui\darkmode.patch
# 再删掉 index.html 里的引导块；plugin-ui/darkmode/ 留着也不会被加载
```

主题偏好存在 `localStorage['0kay_theme_mode']`，清掉即恢复跟随系统。

## 构建

`core/data/plugin-ui/darkmode/` 里的是可直接运行的 ESM（无 SFC、无 JSX）。
改源码后重新构建：

```powershell
cd plugin-web/darkmode
npm install
npm run build          # → ../../core/data/plugin-ui/darkmode/index.js
```

`theme.js` 是纯 IIFE，vite lib 模式不会把它当入口，改完请手动同步一份到
`core/data/plugin-ui/darkmode/`。改了任一文件记得 bump `core/data/ui/darkmode.patch`
里 `module` 的 `?v=` 号。

## 目录

```text
manifest.json                       # 包身份（schema 1）
plugin-web/darkmode/
  theme.js                          # 主题引擎：零依赖（无 import/export，IIFE）
  index.js                          # 外观页：import './theme.js' + 默认导出 Vue 组件
  package.json / vite.config.js     # 构建约定，与 plugin-web/skillsguishow 一致
  manifest.json                     # 放进 0KAY 树后由 0kay-pm 读取的模块清单
  README.md                         # 更详细的设计说明与主题 token 表
core/data/ui/darkmode.patch         # 导航「外观」+ /appearance 路由
core/data/plugin-ui/darkmode/       # Core 经 /api/plugins/darkmode/ui/… 提供的产物
```

拆成两个文件是有原因的：引导脚本可能早于宿主 Vue 桥（`window.__0KAY_VUE__`）执行，
所以被引导的那份**绝不能 import `vue`**。`theme.js` 无任何依赖，任何时机加载都安全；
`index.js` 才是需要宿主 Vue 的页面。

## 运行时 API

```js
__0KAY_THEME__.getMode()          // 'auto' | 'light' | 'dark'
__0KAY_THEME__.resolved()         // 'light' | 'dark'（auto 已解析）
__0KAY_THEME__.setMode('dark')    // 写入偏好并应用
__0KAY_THEME__.toggle()           // 在浅/深之间切换（会固定为显式模式）
__0KAY_THEME__.install()          // 幂等重装（应用 + 挂媒体查询监听）
```

## 兼容性

针对 0KAY 的 `refined` 主题层（`--md-primary: #4d5d91`）调色。WebUI 后续改了
token 或组件类名，深色可能需要跟着补规则；`theme.js` 里所有覆盖都在
`html[data-theme="dark"]` 下，漏掉的只会是局部样式，不会影响浅色模式。
