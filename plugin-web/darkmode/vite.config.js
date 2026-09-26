import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(root, '../../core/data/plugin-ui/darkmode')

// Scheme C: emit ESM into CORE_DATA_DIR/plugin-ui/darkmode/.
// `vue` stays external — WebUI importmap maps it to the host bridge.
// index.js is already valid ESM (no SFC / no JSX), so it also runs straight
// from the source tree when the bundle has not been rebuilt.
export default defineConfig({
  build: {
    outDir,
    emptyOutDir: true,
    target: 'es2020',
    lib: {
      entry: path.join(root, 'index.js'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
