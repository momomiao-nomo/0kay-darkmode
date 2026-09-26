// 0KAY dark mode — WebUI build step.
//
// index.js and theme.js are already browser-ready ESM: index.js imports `vue`
// as a bare specifier (resolved at runtime by the WebUI importmap -> host
// bridge), and theme.js is a dependency-free IIFE. There is nothing to
// transpile or bundle, so the "build" is just a cross-platform copy of the two
// source files into dist/. pm then copies dist/ to CORE_DATA_DIR/plugin-ui/darkmode/.
//
// No node_modules required — `node build.mjs` is the entire build.

import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dist = resolve(here, 'dist')
mkdirSync(dist, { recursive: true })

const files = ['index.js', 'theme.js']
for (const f of files) {
  const src = resolve(here, f)
  if (!existsSync(src)) {
    console.error(`[darkmode] missing source file: ${f}`)
    process.exit(1)
  }
  copyFileSync(src, resolve(dist, f))
  console.log(`[darkmode] ${f} -> dist/${f}`)
}
