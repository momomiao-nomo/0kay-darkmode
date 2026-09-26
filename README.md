# 0kay-darkmode

0KAY WebUI 的暗夜模式插件。不改 0KAY 源码，通过一份 UI patch 加一个原生 ESM 页面实现。

提供四种模式：跟随系统 / 浅色 / 深色 / 按时段，偏好保存在浏览器 `localStorage`。
「跟随系统」随操作系统的深浅色设置切换；「按时段」在指定时间段内自动切换，默认深色时段
19:00–07:00，可在外观页改。

实现上没有另写一套样式，而是覆盖 MD3 的 CSS 变量（`--md-*`、`--neutral-gray-*`、`--shadow-*`），
所以宿主只要继续用这些变量，切主题就不会大面积漏改。

## 安装

插件按 0KAY 插件 API（v1）打包，`manifest.json` 用 `ui` 字段声明构建与发布方式。
只要包名进了 0kay-pm 的包映射，一行即可装好——pm 会自己构建页面、把产物发布到
`CORE_DATA_DIR/plugin-ui/darkmode/`，并连同 `core/data/ui/darkmode.patch` 一起部署到
`CORE_DATA_DIR/ui/`（页面路由与侧边栏入口都靠这份 patch，Core 从 `CORE_DATA_DIR/ui/*.patch` 读取）：

```powershell
0kay-pm install @razuresoft/0kay-darkmode@1.1.0
```

装好不用重启：Core 收到 `/api/ui/patches` 请求时会重扫 patch 目录（3 秒节流），WebUI 每 15 秒轮询一次。

> 个别旧版 pm 只发布 `plugin-ui/`、不自动部署 patch。若装完后侧边栏没有「外观」入口，
> 把仓库里的 `core/data/ui/darkmode.patch` 手动放到 `<OKAY>\core\data\ui\darkmode.patch` 即可
> （升级 pm 后会自动，无需这步）。

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

## 首屏引导（可选）

插件页面是懒加载的：不配置下面这段，刷新会先以默认主题渲染，直到打开「外观」页才会应用
保存的主题。

如需首屏即生效，在 `<OKAY>\webui\index.html` 的 `</head>` 之前加入：

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

提示：不要在 index.html 的内联 module script 里写 `import('/api/...')`。Vite 会把内联脚本
当项目模块做静态分析，而 `/api/...` 是运行时地址，会报
`[plugin:vite:import-analysis] Failed to resolve import`。用 `createElement('script')`
注入可以绕过。

第一段脚本同步执行，先确定 `<html data-theme>` 并用背景色避免首屏闪白；第二段异步加载引擎补 token。

## 卸载

```powershell
Remove-Item <OKAY>\core\data\ui\darkmode.patch
```

导航项和路由都由 patch 提供，删掉即消失。`core/data/plugin-ui/darkmode/` 可以保留，没有
patch 引用就不会被加载。主题偏好在 `localStorage['0kay_theme_mode']`，清除后回到跟随系统。

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
把 `core/data/ui/darkmode.patch` 里 router 那条的 `?v=` 加一即可。

## 目录

```text
manifest.json                         包身份 + ui 构建/发布配置（0kay-pm 读取）
plugin-web/darkmode/
  index.js                            外观页（原生 Vue ESM，默认导出组件）
  theme.js                            主题引擎（零依赖 IIFE）
  build.mjs                           构建：把两个源文件拷进 dist/
  package.json
core/data/ui/darkmode.patch           UI patch（路由 + 侧边栏入口），由 pm 随安装自动部署到 CORE_DATA_DIR/ui/
```

### 为什么拆成两个文件

引导脚本可能在宿主 Vue 桥就位之前执行。模块里一旦 `import { h } from 'vue'` 失败，整个模块
就加载不出来，主题随之失效。所以被引导的 `theme.js` 不含任何依赖（无 import/export，纯 IIFE），
可以在任意时机安全加载；只有 `index.js` 依赖宿主 Vue。

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
