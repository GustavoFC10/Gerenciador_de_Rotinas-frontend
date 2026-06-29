import { routineStatusConfig } from '../../../constants/routineStatus.js'

const routineClosedCardClass = {
  pending:
    'border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-text)] hover:bg-[var(--status-pending-hover-bg)]',
  in_progress:
    'border-[var(--status-progress-border)] bg-[var(--status-progress-strong-bg)] text-[var(--status-progress-strong-text)] hover:bg-[var(--status-progress-hover-bg)] hover:text-[var(--status-progress-text)]',
  error:
    'border-[var(--status-error-border)] bg-[var(--status-error-strong-bg)] text-[var(--status-error-strong-text)] hover:bg-[var(--status-error-hover-bg)] hover:text-[var(--status-error-text)]',
  completed:
    'border-[var(--status-completed-border)] bg-[var(--status-completed-strong-bg)] text-[var(--status-completed-strong-text)] hover:bg-[var(--status-completed-hover-bg)] hover:text-[var(--status-completed-text)]',
}

function RoutineClosedCardCompact({ task, label, onOpen }) {
  const status = routineStatusConfig[task.status]
  const colorClass =
    routineClosedCardClass[task.status] ?? routineClosedCardClass.pending

  return (
    <button
      type="button"
      onClick={() => onOpen?.(task)}
      className={`flex h-9 w-full items-center justify-center rounded-[var(--radius-control)] border px-2 text-center shadow-[var(--shadow-panel)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-floating)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${colorClass}`}
      aria-label={`Abrir ${label}. Status: ${status.label}`}
      title={`${label} - ${status.label}`}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-wide">
        {status.label}
      </span>
    </button>
  )
}

export default RoutineClosedCardCompact
