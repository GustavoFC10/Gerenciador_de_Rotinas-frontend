import { routineStatusConfig } from '../../../constants/routineStatus.js'

function StatusOptions({ task, onStatusChange }) {
  return (
    <div className="grid grid-cols-4 gap-1.5" aria-label="Alterar estado">
      {Object.entries(routineStatusConfig).map(([value, config]) => {
        const isSelected = task.status === value

        return (
          <button
            key={value}
            type="button"
            onClick={() => onStatusChange?.(task.id, value)}
            className={`flex min-h-9 items-center justify-center gap-1.5 rounded-[var(--radius-control)] border px-2 py-1.5 transition ${
              isSelected
                ? `${config.surfaceClass} shadow-[var(--shadow-panel)]`
                : 'border-[var(--color-control-border)] bg-[var(--color-control-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)]'
            }`}
          >
            <span
              className={`size-2.5 shrink-0 rounded-full ${config.dotClass}`}
            />
            <span className="text-[8px] font-bold uppercase tracking-tight sm:text-[9px]">
              {config.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor">
      <path
        d="m8 12.5 6.8-6.8a3 3 0 1 1 4.2 4.2l-8.5 8.5a5 5 0 0 1-7.1-7.1l8.1-8.1"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AttachButton() {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)]"
      aria-label="Anexar arquivo"
      title="Anexar arquivo"
    >
      <PaperclipIcon />
      Anexar
    </button>
  )
}

function NoteTextarea({ task, rows = 3, placeholder }) {
  return (
    <textarea
      defaultValue={task.notes}
      rows={rows}
      aria-label="Observacao"
      placeholder={placeholder}
      className="w-full resize-y rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2 text-sm normal-case tracking-normal text-[var(--color-control-text)] outline-none placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
    />
  )
}

function RoutineCardActions({
  task,
  onStatusChange,
  variant = 'document',
  className = '',
}) {
  const isCompact = variant === 'compact'
  const isPanel = variant === 'panel'

  return (
    <div className={className}>
      <div
        className={`overflow-hidden rounded-[var(--radius-control)] ${
          isPanel
            ? 'bg-[var(--color-panel-soft-bg)] p-3'
            : 'border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)]'
        }`}
      >
        <div
          className={`flex items-center justify-between gap-3 ${
            isPanel ? '' : 'border-b border-[var(--color-divider)] px-3 py-2'
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">
            Observacao
          </span>
          <AttachButton />
        </div>

        <div className={isPanel ? 'mt-2' : 'p-3'}>
          <NoteTextarea
            task={task}
            rows={isCompact ? 3 : 3}
            placeholder="Escreva uma observacao sobre esta rotina..."
          />
        </div>
      </div>

      <div className="mt-4 border-t border-[var(--color-divider)] pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">
          Alterar estado
        </p>
        <StatusOptions task={task} onStatusChange={onStatusChange} />
      </div>
    </div>
  )
}

export default RoutineCardActions
