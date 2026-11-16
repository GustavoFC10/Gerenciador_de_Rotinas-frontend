import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Isolated review artifact. The application's build does not use this entry.
export default defineConfig({
  publicDir: false,
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('https://preview.invalid'),
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: fileURLToPath(new URL('./vendor', import.meta.url)),
    emptyOutDir: false,
    cssCodeSplit: false,
    minify: true,
    lib: {
      entry: fileURLToPath(new URL('./entry.tsx', import.meta.url)),
      name: 'JaralRoutineReview',
      formats: ['iife'],
      fileName: () => 'rotinas-real.js',
      cssFileName: 'rotinas-real',
    },
  },
})
