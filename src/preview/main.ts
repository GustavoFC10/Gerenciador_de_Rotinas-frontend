import { installPreviewBackend } from './mockBackend'

if (!import.meta.env.DEV)
  throw new Error('O preview só pode ser usado no servidor local.')
installPreviewBackend()
// Os serviços capturam fetch na inicialização: o mock precisa estar pronto antes.
void import('./PreviewApp')
