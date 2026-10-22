import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Entrada exclusiva do servidor demonstrativo. O build normal não carrega mocks.
export default defineConfig({
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://preview.invalid'),
  },
  server: { host: '127.0.0.1', port: 4174, strictPort: true },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'local-feature-preview',
      apply: 'serve',
      transformIndexHtml(html) {
        return html.replace('/src/main.tsx', '/src/preview/main.ts')
      },
    },
  ],
})
