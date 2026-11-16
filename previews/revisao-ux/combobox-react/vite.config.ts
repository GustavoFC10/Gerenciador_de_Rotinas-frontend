import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// A local bridge for reviewing the real base component in an approved preview.
export default defineConfig({
  publicDir: false,
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: fileURLToPath(new URL('./vendor', import.meta.url)),
    emptyOutDir: false,
    cssCodeSplit: false,
    minify: true,
    lib: {
      entry: fileURLToPath(new URL('./entry.tsx', import.meta.url)),
      name: 'JaralComboboxReview',
      formats: ['iife'],
      fileName: () => 'combobox-real.js',
      cssFileName: 'combobox-real',
    },
  },
})
