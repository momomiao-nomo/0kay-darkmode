# 0kay-darkmode

0KAY WebUI 的暗夜模式插件。不改 0KAY 源码，通过一份 UI patch 加一个插件页面实现
（插件侧叫 Scheme C，和 `plugin-web/skillsguishow` 同一种写法）。

提供四种模式：跟随系统 / 浅色 / 深色 / 按时段，偏好保存在浏览器 `localStorage`。
「跟随系统」随操作系统的深浅色设置切换；「按时段」在指定的时间段内自动切换，默认
深色时段为 19:00–07:00，可在外观页改。

实现上没有另写一套样式，而是覆盖 MD3 的 CSS 变量（`--md-*`、`--neutral-gray-*`、
`--shadow-*`），因此宿主只要继续使用这些变量，切换主题就不会出现大面积漏改。

## 安装

本仓库的目录结构和 0KAY 主仓库一致，按对应路径拷贝即可：

```powershell
git clone https://github.com/momomiao-nomo/0kay-darkmode.git
cd 0kay-darkmode

# <OKAY> 指 0KAY 的安装目录
Copy-Item plugin-web\darkmode           <OKAY>\plugin-web\darkmode           -Recurse -Force
Copy-Item core\data\ui\darkmode.patch   <OKAY>\core\data\ui\darkmode.patch   -Force
Copy-Item core\data\plugin-ui\darkmode  <OKAY>\core\data\plugin-ui\darkmode  -Recurse -Force
```

`core/data/plugin-ui/darkmode/` 下是已经构建好的 ESM，不需要安装 node 依赖。
Core 在收到 `/api/ui/patches` 请求时会重扫 patch 目录（3 秒节流），WebUI 每 15 秒轮询一次，
文件放好后无需重启。

## 首屏引导（可选）

插件页面是懒加载的：不配置下面这段，刷新页面会先以默认主题渲染，直到打开「外观」页
才会应用保存的主题。

如需首屏即生效，在 `<OKAY>/webui/index.html` 的 `</head>` 之前加入：

```html
<script>
  try {
    var m = localStorage.getItem('0kay_theme_mode') || 'auto';
    var dark;
    if (m === 'dark') dark = true;
    else if (m === 'light') dark = false;
    else if (m === 'schedule') {
      var s = null;
      try { s = JSON.parse(localStorage.getItem('0kay_theme_schedule') || 'null'); } catch (e) {}
      var from = (s && s.darkFrom) || '19:00';
      var until = (s && s.darkUntil) || '07:00';
      var toMin = function (t) { var p = t.split(':'); return (+p[0]) * 60 + (+p[1]); };
      var now = new Date(), min = now.getHours() * 60 + now.getMinutes();
      var a = toMin(from), b = toMin(until);
      dark = a === b ? false : (a < b ? (min >= a && min < b) : (min >= a || min < b));
    } else {
      dark = matchMedia('(prefers-color-scheme: dark)').matches;
    }
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

注意：不要在 index.html 的内联 module script 里写 `import('/api/...')`。Vite 会把内联脚本
当作项目模块做静态分析，而 `/api/...` 是运行时地址，解析失败会报
`[plugin:vite:import-analysis] Failed to resolve import`。用 `createElement('script')`
注入可以绕过 Vite 的分析。

第一段脚本是同步执行的，先确定 `<html data-theme>`，并用两条背景色避免首屏闪白；
第二段再异步加载引擎，补全 token。

## 卸载

```powershell
Remove-Item <OKAY>\core\data\ui\darkmode.patch
# 同时移除 index.html 里加入的引导块
```

导航项和路由都由 patch 提供，删除 patch 后即消失。`core/data/plugin-ui/darkmode/`
可以保留，没有 patch 引用就不会被加载。主题偏好存在 `localStorage['0kay_theme_mode']`，
清除后回到跟随系统。

## 构建

`core/data/plugin-ui/darkmode/` 下是可直接运行的 ESM。修改源码后：

```powershell
cd plugin-web/darkmode
npm install
npm run build          # 输出到 ../../core/data/plugin-ui/darkmode/index.js
```

`theme.js` 是纯 IIFE，不会被打进 lib 模式的 bundle，改完需手动同步一份到
`core/data/plugin-ui/darkmode/`。改动后还要把 `core/data/ui/darkmode.patch` 里
`module` 的 `?v=` 版本号加一，避免浏览器命中旧缓存。

## 目录

```text
manifest.json                       包身份，供 0kay-pm 读取
plugin-web/darkmode/
  theme.js                          主题引擎
  index.js                          「外观」页面
  package.json / vite.config.js     构建配置
  manifest.json                     放入 0KAY 树后由 0kay-pm 读取
core/data/ui/darkmode.patch         UI patch
core/data/plugin-ui/darkmode/       Core 通过 /api/plugins/darkmode/ui/ 提供的产物
```

### 为什么拆成两个文件

引导脚本可能在宿主 Vue 桥（`window.__0KAY_VUE__`）就绪之前执行。模块里一旦
`import { h } from 'vue'`，导入失败会导致整个模块加载失败，主题随之失效，宿主会报
`__0KAY_VUE__ is not ready`。

因此被引导的 `theme.js` 不包含任何依赖（没有 import/export，纯 IIFE），可以安全地在任意
时机加载；只有 `index.js` 依赖宿主 Vue。

## 浏览器 API

引擎会挂载 `window.__0KAY_THEME__`：

```js
__0KAY_THEME__.getMode()          // 'auto' | 'light' | 'dark' | 'schedule'
__0KAY_THEME__.resolved()         // 'light' | 'dark'（auto / schedule 已解析）
__0KAY_THEME__.setMode('dark')    // 写入偏好并应用
__0KAY_THEME__.toggle()           // 浅色/深色切换
__0KAY_THEME__.getSchedule()      // { darkFrom: '19:00', darkUntil: '07:00' }
__0KAY_THEME__.setSchedule({ darkFrom: '20:00', darkUntil: '06:30' })
__0KAY_THEME__.install()          // 幂等重装
```

## 兼容性与已知问题

所有覆盖规则都挂在 `html[data-theme="dark"]` 下，即使后续 WebUI 修改了类名或 token，
影响也仅限于局部，不会破坏浅色模式。

配色按 0KAY 当前的 `refined` 主题（`--md-primary: #4d5d91`）调整。除 token 外，还覆盖了
几处 WebUI 中写死的颜色：refined 层的 `#f8f9fb` 灰底、导航栏与会话栏、Live2D 舞台渐变、
`<select>` 箭头 SVG，以及 AboutPanel / UsagePage 中写死的容器文字色。并补了
`--md-on-error-container` / `--md-on-success-container` / `--md-on-warning-container`
三个宿主未定义的变量，否则深色下这些容器的文字对比度会不足。
