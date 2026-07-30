import { useState, type FormEvent } from 'react'

import Button from '../../ui/Button'
import type { CreateTaskLinkInput, EntityId, Task } from '../../../types/domain'
import { getTaskLinkHost, normalizeTaskLinkUrl } from '../../../utils/taskLinks'

interface TaskLinksPanelProps {
  task: Task
  title?: string
  compact?: boolean
  onLinkAdd?: (taskId: EntityId, link: CreateTaskLinkInput) => void
  onLinkRemove?: (taskId: EntityId, linkId: EntityId) => void
}

function TaskLinksPanel({
  task,
  title = 'Links',
  compact = false,
  onLinkAdd,
  onLinkRemove,
}: TaskLinksPanelProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const links = task.links ?? []

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedUrl = normalizeTaskLinkUrl(url)

    if (!normalizedUrl) {
      setError('Informe um endereço completo iniciado por http:// ou https://.')
      return
    }

    onLinkAdd?.(task.id, {
      label: label.trim() || getDefaultLinkLabel(normalizedUrl),
      url: normalizedUrl,
    })
    setLabel('')
    setUrl('')
    setError('')
    setIsAdding(false)
  }

  return (
    <section aria-labelledby={`task-links-title-${task.id}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text-muted)]">
            <LinkIcon />
          </span>
          <h3
            id={`task-links-title-${task.id}`}
            className="text-sm font-bold text-[var(--color-text-strong)]"
          >
            {title}
          </h3>
          {links.length > 0 && (
            <span className="rounded-full bg-[var(--color-panel-soft-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-muted)] ring-1 ring-[var(--color-panel-border)]">
              {links.length}
            </span>
          )}
        </div>

        {onLinkAdd && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-xs font-extrabold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)] focus-visible:underline"
          >
            Adicionar link
          </button>
        )}
      </div>

      {links.length > 0 ? (
        <ul
          className={`mt-2 grid gap-2 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}
        >
          {links.map((link) => (
            <li
              key={link.id}
              className="flex min-w-0 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-3 py-2"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                <ExternalLinkIcon />
              </span>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
              >
                <span className="block truncate text-sm font-bold text-[var(--color-text-strong)] hover:text-[var(--color-brand)]">
                  {link.label}
                </span>
                <span className="block truncate text-xs text-[var(--color-text-muted)]">
                  {getTaskLinkHost(link.url)}
                </span>
              </a>
              {onLinkRemove && (
                <button
                  type="button"
                  onClick={() => onLinkRemove(task.id, link.id)}
                  className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:bg-[var(--status-error-bg)] hover:text-[var(--status-error-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
                  aria-label={`Remover link ${link.label}`}
                  title="Remover link"
                >
                  <TrashIcon />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !isAdding && (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Nenhum link salvo nesta tarefa.
          </p>
        )
      )}

      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 rounded-[var(--radius-control)] border border-[var(--color-control-focus)] bg-[var(--color-panel-soft-bg)] p-3 ring-2 ring-[var(--color-focus-ring)]"
        >
          <div
            className={`grid gap-3 ${
              compact
                ? 'grid-cols-1'
                : 'sm:grid-cols-[minmax(10rem,0.7fr)_minmax(14rem,1.3fr)]'
            }`}
          >
            <label className="text-xs font-bold text-[var(--color-text-muted)]">
              <span className="mb-1 block">Nome do link</span>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Ex.: Portal de notas"
                autoFocus
                className="min-h-9 w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 text-sm font-medium text-[var(--color-control-text)] outline-none placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)]"
              />
            </label>
            <label className="text-xs font-bold text-[var(--color-text-muted)]">
              <span className="mb-1 block">Endereço *</span>
              <input
                type="url"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value)
                  setError('')
                }}
                placeholder="https://..."
                required
                className="min-h-9 w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 text-sm font-medium text-[var(--color-control-text)] outline-none placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)]"
              />
            </label>
          </div>

          {error && (
            <p className="mt-2 text-xs font-semibold text-[var(--status-error-text)]">
              {error}
            </p>
          )}

          <div
            className={`mt-3 flex gap-2 ${compact ? 'flex-col-reverse' : 'justify-end'}`}
          >
            <Button
              type="button"
              tone="neutral"
              size="sm"
              onClick={() => {
                setIsAdding(false)
                setError('')
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" tone="primary" size="sm">
              Salvar link
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}

function getDefaultLinkLabel(url: string): string {
  return getTaskLinkHost(url) || 'Link de apoio'
}

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
    </svg>
  )
}

export default TaskLinksPanel
