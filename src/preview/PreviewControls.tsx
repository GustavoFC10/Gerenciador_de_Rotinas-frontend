import { useState } from 'react'
import Button from '../components/ui/Button'
import { useAppState } from '../hooks/useAppState'
import { useAuth } from '../hooks/useAuth'
import { installPreviewBackend, previewPersonas } from './mockBackend'

export default function PreviewControls() {
  const [expanded, setExpanded] = useState(false)
  const { user } = useAuth()
  const backend = installPreviewBackend()
  return (
    <aside
      aria-label="Controles da demonstração"
      className="feature-preview-controls fixed bottom-3 right-3 z-50 max-w-[calc(100vw-24px)] text-sm"
    >
      {expanded && (
        <div className="mb-2 w-80 max-w-full max-h-[75dvh] overflow-y-auto rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-4 text-[var(--color-text-main)] shadow-xl">
          <h2 className="font-extrabold text-[var(--color-text-strong)]">
            Preview das novas funcionalidades
          </h2>
          <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
            Dados fictícios salvos somente neste navegador. Não há conexão com
            staging nem envio de e-mails.
          </p>
          <label
            className="mt-4 block text-xs font-bold"
            htmlFor="preview-persona"
          >
            Visualizar como
          </label>
          <select
            id="preview-persona"
            className="mt-1 min-h-10 w-full rounded-lg border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-2"
            value={backend.state.actor}
            onChange={(event) => {
              backend.selectActor(event.target.value)
              location.assign('/hub')
            }}
          >
            {previewPersonas.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
            {backend.actor.description}
          </p>
          {user && <PreviewTheme />}
          <nav
            aria-label="Atalhos do preview"
            className="mt-4 flex flex-wrap gap-2"
          >
            <a
              href="/hub"
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 font-bold text-[var(--color-brand)]"
            >
              HUB
            </a>
            <a
              href="/processos"
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 font-bold text-[var(--color-brand)]"
            >
              Processos
            </a>
            {backend.actor.role === 'owner' && (
              <a
                href="/equipe"
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 font-bold text-[var(--color-brand)]"
              >
                Equipe
              </a>
            )}
          </nav>
          <Button
            className="mt-4 w-full"
            onClick={() => {
              backend.reset()
              location.assign('/hub')
            }}
          >
            Reiniciar demonstração
          </Button>
        </div>
      )}
      <button
        className="rounded-full border border-blue-700 bg-blue-700 px-4 py-2 font-bold text-white shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded
          ? 'Fechar opções do preview'
          : 'Preview local · dados fictícios'}
      </button>
    </aside>
  )
}
function PreviewTheme() {
  const { preferences, setPreferences } = useAppState()
  return (
    <div className="mt-4 flex gap-2" role="group" aria-label="Tema do preview">
      {(['light', 'dark'] as const).map((theme) => (
        <Button
          key={theme}
          tone={preferences.theme === theme ? 'selected' : 'neutral'}
          onClick={() => setPreferences((current) => ({ ...current, theme }))}
        >
          {theme === 'light' ? 'Claro' : 'Escuro'}
        </Button>
      ))}
    </div>
  )
}
