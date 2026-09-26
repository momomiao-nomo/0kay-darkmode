# 0kay-darkmode

给 0KAY WebUI 做的暗夜模式。

没改 0KAY 一行源码，就是一份 UI patch 加一个插件自己的页面（官方文档里叫 Scheme C），
写法和 `plugin-web/skillsguishow` 一个路子。

装完之后左边导航会多一个「外观」，进去选跟随系统 / 浅色 / 深色，选完记在浏览器里。
选「跟随系统」的话系统切深色它也跟着切，不用手动管。

配色没另起一套，是直接换 MD3 的 token（`--md-*`、`--neutral-gray-*`、`--shadow-*`），
所以只要宿主还在用这套变量，深浅切换就不会漏掉大片区域。

## 装

仓库的目录结构是照着 0KAY 主仓库摆的，所以直接抄过去就行：

```powershell
git clone https://github.com/momomiao-nomo/0kay-darkmode.git
cd 0kay-darkmode

# <OKAY> 换成你本机 0KAY 的目录
Copy-Item plugin-web\darkmode           <OKAY>\plugin-web\darkmode           -Recurse -Force
Copy-Item core\data\ui\darkmode.patch   <OKAY>\core\data\ui\darkmode.patch   -Force
Copy-Item core\data\plugin-ui\darkmode  <OKAY>\core\data\plugin-ui\darkmode  -Recurse -Force
```

`core/data/plugin-ui/darkmode/` 里放的是构建好的 ESM，机器上没装 node 也能用。
Core 被人请求 `/api/ui/patches` 时会重扫一遍 patch（3 秒节流），WebUI 那边 15 秒轮询一次，
所以文件丢进去就生效，不用重启服务。

想要更省事的话，其实可以把这三条路径整个覆盖过去——结构是一样的。

## 想让它开屏就是深色，还得补一段

插件页是**点到才加载**的。不加下面这段的话，刷新会先白/亮一下，非得点进「外观」才变暗。

在 `<OKAY>/webui/index.html` 的 `</head>` 前面插进去：

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

这段我在你仓库里踩过一次坑，写的时候留意一下：**别写成内联 `import('/api/...')`**。
Vite 会把 `index.html` 里的内联 module script 抽成虚拟模块做静态分析，`/api/...` 是运行时
才存在的地址，它当项目文件去找，找不到就直接甩一个
`[plugin:vite:import-analysis] Failed to resolve import` 出来。用 `createElement` 塞
`<script>` 标签绕开，Vite 就看不到这条路径了。

代码里第一段是同步跑的，先把 `<html data-theme>` 定下来；配上那两条背景色，
首屏到引擎加载完之前不会闪白。第二段才异步把引擎拉进来补全 token 表。

## 卸

导航项和路由都是 patch 给的，所以删掉 patch 就全没了：

```powershell
Remove-Item <OKAY>\core\data\ui\darkmode.patch
# index.html 里加上去的那段也删掉
```

`core/data/plugin-ui/darkmode/` 留着无所谓，没 patch 引用它就不会被加载。
主题偏好存在 `localStorage['0kay_theme_mode']`，清掉就回到跟随系统。

## 改代码

`core/data/plugin-ui/darkmode/` 里那份是能直接跑的 ESM，不是压缩产物。改源码之后重新构建：

```powershell
cd plugin-web/darkmode
npm install
npm run build          # 输出到 ../../core/data/plugin-ui/darkmode/index.js
```

`theme.js` 是个纯 IIFE，vite 的 lib 模式不会把它当入口打进去，所以改完得手动抄一份到
`core/data/plugin-ui/darkmode/`。另外改了文件记得把 `core/data/ui/darkmode.patch` 里
`module` 后面的 `?v=` 往上加一，不然浏览器缓存里面的旧模块不一定换。

## 目录

```
manifest.json                       包身份，给 0kay-pm 看的
plugin-web/darkmode/                ← 抄到 <OKAY>/plugin-web/darkmode/
  theme.js                          主题引擎
  index.js                          「外观」页面
  package.json, vite.config.js      构建配置，和 skillsguishow 对齐
  manifest.json                     放进 0KAY 树之后由 0kay-pm 读的那份
core/data/ui/darkmode.patch         ← 抄到 <OKAY>/core/data/ui/
core/data/plugin-ui/darkmode/       ← 抄到 <OKAY>/core/data/plugin-ui/
```

### 为什么要拆成两个文件

因为引导脚本可能跑在宿主 Vue 桥（`window.__0KAY_VUE__`）就位之前。
模块里只要写了 `import { h } from 'vue'`，导入失败整个模块就挂了，主题也就装不上——
宿主那边会报 `__0KAY_VUE__ is not ready`。

所以被引导的那个 `theme.js` 一点依赖都没有（没有 import/export，纯 IIFE），什么时候加载都安全；
需要宿主 Vue 的只有 `index.js`，也就是那个页面。

## 在控制台里能用

引擎挂了个 `window.__0KAY_THEME__`：

```js
__0KAY_THEME__.getMode()          // 'auto' | 'light' | 'dark'
__0KAY_THEME__.resolved()         // 'light' | 'dark'，auto 已经解析过
__0KAY_THEME__.setMode('dark')    // 写偏好 + 立刻应用
__0KAY_THEME__.toggle()           // 浅深互切，会固定成显式模式
__0KAY_THEME__.install()          // 幂等重装
```

## 可能出问题的地方

覆盖规则全是挂在 `html[data-theme="dark"]` 下面的，所以就算哪天 WebUI 改了类名或者 token，
最坏也就是局部没跟上，浅色模式不受影响。

调色是照 0KAY 现在那套 `refined` 主题（`--md-primary: #4d5d91`）配的。除了 token，
还补了几处 WebUI 里写死的浅色：refined 层的 `#f8f9fb` 灰底、导航和会话栏、
Live2D 舞台的渐变、`<select>` 那个箭头 SVG，以及 AboutPanel/UsagePage 里几个写死的深色文字。
另外补了 `--md-on-error-container` / `--md-on-success-container` / `--md-on-warning-container`
这三个宿主没定义的 token，不然深色下那些容器里的文字会跟背景糊在一起。
