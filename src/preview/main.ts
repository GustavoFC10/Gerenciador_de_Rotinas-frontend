import { installPreviewBackend } from './mockBackend'

if (!import.meta.env.DEV)
  throw new Error('O preview só pode ser usado no servidor local.')
const backend = installPreviewBackend()
const url = new URL(window.location.href)
const persona = url.searchParams.get('preview-persona')
if (persona) {
  backend.selectActor(persona)
  url.searchParams.delete('preview-persona')
  window.history.replaceState(window.history.state, '', url)
}
// Os serviços capturam fetch na inicialização: o mock precisa estar pronto antes.
void import('./PreviewApp')
