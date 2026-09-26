「外观」页面和主题引擎。安装、卸载、原理这些写在仓库根目录的 README 里，
这里只记几个改代码的时候需要注意的点。

- `theme.js` 是主题引擎，**零依赖**——IIFE，没有 import 也没有 export。因为引导脚本
  可能跑在宿主 Vue 桥（`window.__0KAY_VUE__`）就位之前，这一份要是 import 了 `vue`，
  导入失败会把整个模块带崩，主题也就装不上了。
- `index.js` 是「外观」页面，`import './theme.js'` 把引擎带进来，默认导出一个 Vue 组件。
  它只会被 WebUI 在运行时从 `/api/plugins/darkmode/ui/` 拉走，不经过 Vite。
- 构建：`npm install && npm run build` → `../../core/data/plugin-ui/darkmode/index.js`。
  `theme.js` 不进 bundle，改完记得手动抄一份到 `core/data/plugin-ui/darkmode/`。
- 改了文件就把 `core/data/ui/darkmode.patch` 里 `module` 后面的 `?v=` 加一。
- 页面样式全在 `.dm-` 命名空间里，卡片那几条得写成 `#app .dm .dm-card`——
  宿主的 `#app button { … }` 优先级是 (1,0,1)，光写 `.dm-card` 压不住它的 `border-radius`、
  `transition` 那些。
