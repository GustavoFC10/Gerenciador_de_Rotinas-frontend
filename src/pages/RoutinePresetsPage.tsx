import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'

import Button from '../components/ui/Button'
import { focusRing } from '../constants/designTokens'
import { ROUTES } from '../constants/routes'
import WorkspaceBar from '../layouts/WorkspaceBar'
import {
  routinePresetService,
  type RoutinePresetResource,
} from '../services/routinePresetService'
import type { Routine } from '../types/domain'
import { normalizeSearch } from '../utils/normalizeSearch'

interface RoutinePresetsPageProps {
  routines: Routine[]
  header?: ReactNode
}

function RoutinePresetsPage({
  routines,
  header,
}: RoutinePresetsPageProps) {
  const [presets, setPresets] = useState<RoutinePresetResource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  async function loadPresets() {
    setIsLoading(true)
    setError('')

    try {
      setPresets(await routinePresetService.list())
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível carregar as predefinições.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadPresets()
  }, [])

  return (
    <div
      className={
        header
          ? 'flex min-h-0 w-full flex-1 flex-col'
          : 'mx-auto flex min-h-0 w-full max-w-[76rem] flex-1 flex-col'
      }
    >
      {header ?? (
        <WorkspaceBar
          context={{ label: 'Configurações', to: ROUTES.SETTINGS }}
          title="Predefinições de rotina"
          label="Configuração operacional"
          actions={
            <Button onClick={() => setIsCreating(true)}>
              <PlusIcon />
              Nova predefinição
            </Button>
          }
        />
      )}

      {header && (
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setIsCreating(true)}>
            <PlusIcon />
            Nova predefinição
          </Button>
        </div>
      )}

      <section className="mb-5 rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-5 py-4 shadow-[var(--shadow-panel)] sm:px-6">
        <p className="max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
          Predefinições agrupam rotinas para aplicação consistente em empresas.
          Elas guardam a versão das rotinas escolhidas no momento da criação.
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-[var(--radius-control)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-error-text)]"
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
          Carregando predefinições…
        </p>
      ) : presets.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {presets.map((preset) => (
            <article
              key={preset.id}
              className="rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-5 shadow-[var(--shadow-panel)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black text-[var(--color-text-strong)]">
                    {preset.name}
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
                    {preset.description || 'Sem descrição.'}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--color-panel-soft-bg)] px-2.5 py-1 text-xs font-bold text-[var(--color-text-muted)]">
                  {preset.items.length} {preset.items.length === 1 ? 'rotina' : 'rotinas'}
                </span>
              </div>
              <ul className="mt-4 space-y-2 border-t border-[var(--color-divider)] pt-3">
                {preset.items.map((item) => (
                  <li
                    key={item.routineId}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate font-bold text-[var(--color-text-strong)]">
                      {item.routineShotname} · {item.routineName}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-[var(--color-text-subtle)]">
                      v{item.versionNumber}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : (
        <section className="rounded-[var(--radius-panel)] border border-dashed border-[var(--color-divider)] bg-[var(--color-panel-bg)] px-5 py-12 text-center">
          <h2 className="text-base font-black text-[var(--color-text-strong)]">
            Nenhuma predefinição criada
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
            Crie um pacote de rotinas para repetir uma configuração operacional
            sem selecionar cada rotina novamente.
          </p>
          <Button className="mt-5" onClick={() => setIsCreating(true)}>
            Criar predefinição
          </Button>
        </section>
      )}

      {isCreating && (
        <PresetCreateDrawer
          routines={routines}
          onClose={() => setIsCreating(false)}
          onCreated={async () => {
            setIsCreating(false)
            await loadPresets()
          }}
        />
      )}
    </div>
  )
}

function PresetCreateDrawer({
  routines,
  onClose,
  onCreated,
}: {
  routines: Routine[]
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')
  const [routineIds, setRoutineIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const activeRoutines = useMemo(
    () =>
      routines
        .filter((routine) => routine.active !== false)
        .filter((routine) =>
          normalizeSearch([routine.shortName, routine.name].join(' ')).includes(
            normalizeSearch(search),
          ),
        )
        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    [routines, search],
  )

  function toggleRoutine(routineId: string) {
    setRoutineIds((current) =>
      current.includes(routineId)
        ? current.filter((item) => item !== routineId)
        : [...current, routineId],
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('Informe o nome da predefinição.')
      return
    }

    if (!routineIds.length) {
      setError('Selecione ao menos uma rotina.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      await routinePresetService.create({
        name: trimmedName,
        description: description.trim() || undefined,
        routineIds,
      })
      await onCreated()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível criar a predefinição.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[var(--color-overlay-bg)] backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose()
      }}
    >
      <form
        className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-[var(--color-panel-border)] bg-[var(--color-app-bg)] shadow-[-12px_0_36px_rgb(15_23_42_/_0.22)]"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--color-divider)] bg-[var(--color-panel-bg)] px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--color-brand)]">
              Configuração operacional
            </p>
            <h2 className="mt-1 text-xl font-black text-[var(--color-text-strong)]">
              Nova predefinição
            </h2>
            <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)]">
              Selecione as rotinas que devem ser aplicadas juntas.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            disabled={isSaving}
            className={`grid size-9 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] ${focusRing}`}
          >
            ×
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {error && (
            <p role="alert" className="mb-4 text-sm font-semibold text-[var(--status-error-text)]">
              {error}
            </p>
          )}
          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-[var(--color-text-strong)]">Nome *</span>
            <input
              value={name}
              maxLength={160}
              onChange={(event) => setName(event.target.value)}
              disabled={isSaving}
              className="min-h-10 rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 text-sm text-[var(--color-text-strong)] outline-none focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
            />
          </label>
          <label className="mt-4 grid gap-1.5">
            <span className="text-sm font-bold text-[var(--color-text-strong)]">Descrição</span>
            <textarea
              value={description}
              rows={3}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isSaving}
              className="resize-y rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2 text-sm text-[var(--color-text-strong)] outline-none focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
            />
          </label>
          <div className="mt-6 border-t border-[var(--color-divider)] pt-5">
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-[var(--color-text-strong)]">Rotinas *</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar rotina"
                disabled={isSaving}
                className="min-h-10 rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 text-sm text-[var(--color-text-strong)] outline-none focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
              />
            </label>
            <ul className="mt-3 max-h-72 divide-y divide-[var(--color-divider)] overflow-y-auto rounded-[var(--radius-control)] border border-[var(--color-divider)] bg-[var(--color-panel-bg)]">
              {activeRoutines.map((routine) => (
                <li key={routine.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-[var(--color-control-hover-bg)]">
                    <input
                      type="checkbox"
                      checked={routineIds.includes(routine.id)}
                      onChange={() => toggleRoutine(routine.id)}
                      disabled={isSaving}
                      className="size-4 accent-[var(--color-brand)]"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-[var(--color-text-strong)]">
                        {routine.shortName} · {routine.name}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t border-[var(--color-divider)] bg-[var(--color-panel-bg)] px-5 py-4 sm:px-6">
          <Button type="button" tone="neutral" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Salvando…' : 'Criar predefinição'}
          </Button>
        </footer>
      </form>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mr-2 size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

export default RoutinePresetsPage
