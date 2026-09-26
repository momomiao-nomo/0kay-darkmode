「外观」页面和主题引擎。`index.js` 是页面（原生 Vue ESM，默认导出组件），
`theme.js` 是主题引擎（零依赖 IIFE）。两个文件本身就能在浏览器里直接跑，所以没有打包步骤——
`build.mjs` 只是把它们复制到 `dist/`。

- `build.mjs` 用 node 内置 `fs` 复制，不依赖 vite 或 npm install。`index.js` 里的
  `import { … } from 'vue'` 是运行时由宿主 importmap 映射到宿主桥（`window.__0KAY_VUE__`），
  构建阶段不需要 vue。
- 产物 `dist/index.js`、`dist/theme.js` 由 0kay-pm 按根目录 `manifest.json` 的 `ui` 配置
  发布到 `CORE_DATA_DIR/plugin-ui/darkmode/`，Core 在
  `/api/plugins/darkmode/ui/{index.js,theme.js}` 提供。
- 页面样式都在 `.dm-` 命名空间；卡片那种要写成 `#app .dm .dm-card`——宿主的
  `#app button { … }` 优先级是 (1,0,1)，光写 `.dm-card` 压不住它的 `border-radius`、
  `transition`。
- `index.js` 现在由 `core/data/ui/darkmode.patch` 的 **settings** 那条以 `module` 形式内嵌到「设置 → 外观」，不再注册侧边栏与 `/appearance` 路由。宿主只挂载默认导出组件，不会自带保存按钮。
- 改了源文件就把仓库里 `core/data/ui/darkmode.patch` 的 `?v=` 加一（settings 的 `index.js`、bootstrap 的 `theme.js` 两条各自维护），重新安装（让 pm 重新部署 patch）即可避免浏览器命中旧缓存。
