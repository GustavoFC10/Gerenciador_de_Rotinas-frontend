import { routineStatusConfig } from '../../../constants/routineStatus'
import type { RoutineStatus } from '../../../types/domain'

function RoutineStatusSelect({
  value,
  onChange,
  className = '',
}: {
  value: RoutineStatus
  onChange?: (status: RoutineStatus) => void
  className?: string
}) {
  const currentStatus = routineStatusConfig[value]

  return (
    <div className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">
        Estado
      </span>
      <details className="group relative">
        <summary
          className={`flex min-h-10 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-control)] border px-3 text-sm font-bold transition marker:hidden hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${currentStatus.surfaceClass}`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className={`size-2.5 shrink-0 rounded-full ${currentStatus.dotClass}`} />
            <span className="truncate">{currentStatus.label}</span>
          </span>
          <ChevronDownIcon />
        </summary>
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-1 shadow-[var(--shadow-floating)]">
          {Object.entries(routineStatusConfig).map(([status, config]) => (
            <button
              key={status}
              type="button"
              onClick={(event) => {
                onChange?.(status as RoutineStatus)
                event.currentTarget.closest('details')?.removeAttribute('open')
              }}
              className="flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm font-semibold text-[var(--color-text-muted)] transition hover:bg-[var(--color-control-hover-bg)]"
            >
              <span className={`size-2.5 rounded-full ${config.dotClass}`} />
              {config.label}
            </button>
          ))}
        </div>
      </details>
    </div>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m7 9.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default RoutineStatusSelect
