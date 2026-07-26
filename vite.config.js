import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['mind-ar'],
  },
  build: {
    commonjsOptions: {
      include: [/mind-ar/, /node_modules/],
    },
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        collectiblePreview: resolve(rootDir, 'collectible-preview.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
