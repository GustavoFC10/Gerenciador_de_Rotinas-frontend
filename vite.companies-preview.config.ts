import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// This isolated entry never mounts App, auth, services, or operational mocks.
// The built HTML is self-contained and can be opened directly from disk.
function standalonePreview(): Plugin {
  return {
    name: 'companies-standalone-visual-preview',
    enforce: 'post',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const inlinedFiles = new Set<string>()
        for (const output of Object.values(bundle)) {
          if (output.type !== 'asset' || !output.fileName.endsWith('.html'))
            continue
          let html = String(output.source)
          html = html.replace(
            /<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g,
            (tag, url: string) => {
              const script = bundle[url.replace(/^\.\//, '')]
              if (script?.type !== 'chunk') return tag
              inlinedFiles.add(script.fileName)
              return `<script type="module">${script.code.replace(/<\/script/gi, '<\\/script')}</script>`
            },
          )
          html = html.replace(
            /<link\b[^>]*\bhref="([^"]+\.css)"[^>]*>/g,
            (tag, url: string) => {
              const style = bundle[url.replace(/^\.\//, '')]
              if (style?.type !== 'asset') return tag
              inlinedFiles.add(style.fileName)
              return `<style>${String(style.source).replace(/<\/style/gi, '<\\/style')}</style>`
            },
          )
          output.source = html
        }
        for (const name of inlinedFiles) delete bundle[name]
      },
    },
  }
}

export default defineConfig({
  root: fileURLToPath(new URL('./src/preview/companies', import.meta.url)),
  base: './',
  plugins: [react(), tailwindcss(), standalonePreview()],
  server: { host: '127.0.0.1', port: 4175, strictPort: true },
  build: {
    outDir: fileURLToPath(new URL('./previews/empresas', import.meta.url)),
    emptyOutDir: false,
  },
})
