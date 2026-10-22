import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import App from '../App'
import PreviewControls from './PreviewControls'
import { AppStateProvider } from '../contexts/AppStateContext'
import { AuthProvider } from '../contexts/AuthContext'
import { NotificationsProvider } from '../contexts/NotificationsContext'
import { queryClient } from '../query/queryClient'
import '../styles/index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Raiz do preview não encontrada.')
const style = document.createElement('style')
style.textContent =
  'body:has([role="dialog"][aria-modal="true"]) .feature-preview-controls{display:none}'
document.head.append(style)
document.title = 'Preview local · Rotinas e Processos'
createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppStateProvider>
            <NotificationsProvider>
              <App />
              <PreviewControls />
            </NotificationsProvider>
          </AppStateProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
