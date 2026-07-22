import {
  ROUTINE_STATUS,
  routineStatusConfig,
} from '../../../constants/routineStatus.js'
import RoutineStatusIcon from '../shared/RoutineStatusIcon.jsx'

const routineClosedCardClass = {
  [ROUTINE_STATUS.PENDING]:
    'border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-text)] hover:bg-[var(--status-pending-hover-bg)]',
  [ROUTINE_STATUS.IN_PROGRESS]:
    'border-[var(--status-progress-border)] bg-[var(--status-progress-strong-bg)] text-[var(--status-progress-strong-text)] hover:bg-[var(--status-progress-hover-bg)] hover:text-[var(--status-progress-text)]',
  [ROUTINE_STATUS.ERROR]:
    'border-[var(--status-error-border)] bg-[var(--status-error-strong-bg)] text-[var(--status-error-strong-text)] hover:bg-[var(--status-error-hover-bg)] hover:text-[var(--status-error-text)]',
  [ROUTINE_STATUS.COMPLETED]:
    'border-[var(--status-completed-border)] bg-[var(--status-completed-strong-bg)] text-[var(--status-completed-strong-text)] hover:bg-[var(--status-completed-hover-bg)] hover:text-[var(--status-completed-text)]',
  [ROUTINE_STATUS.NO_MOVEMENT]:
    'border-[var(--color-brand)] bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-strong)]',
  [ROUTINE_STATUS.NOT_APPLICABLE]:
    'border-[var(--color-text-subtle)] bg-[var(--color-text-subtle)] text-white hover:bg-[var(--color-text-muted)]',
}

const roundCellClass = {
  [ROUTINE_STATUS.PENDING]:
    'border border-[var(--color-control-border)] bg-[var(--color-list-panel-bg)] text-[var(--color-text-strong)] hover:bg-[var(--color-control-hover-bg)]',
  [ROUTINE_STATUS.IN_PROGRESS]:
    'bg-[var(--status-progress-strong-bg)] text-white hover:bg-[var(--status-progress-dot)]',
  [ROUTINE_STATUS.ERROR]:
    'bg-[var(--status-error-strong-bg)] text-white hover:bg-[var(--status-error-dot)]',
  [ROUTINE_STATUS.COMPLETED]:
    'bg-[var(--status-completed-strong-bg)] text-white hover:bg-[var(--status-completed-dot)]',
  [ROUTINE_STATUS.NO_MOVEMENT]:
    'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-strong)]',
  [ROUTINE_STATUS.NOT_APPLICABLE]:
    'bg-[var(--color-text-subtle)] text-white hover:bg-[var(--color-text-muted)]',
}

function RoutineClosedCardCompact({ task, label, onOpen, variant = 'label' }) {
  const status =
    routineStatusConfig[task.status] ??
    routineStatusConfig[ROUTINE_STATUS.PENDING]

  if (variant === 'round') {
    const colorClass = roundCellClass[task.status] ?? roundCellClass.pending

    return (
      <button
        type="button"
        onClick={() => onOpen?.(task)}
        className={`relative mx-auto grid size-9 place-items-center rounded-full shadow-[var(--shadow-panel)] transition hover:z-10 hover:scale-125 hover:shadow-[var(--shadow-floating)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${colorClass}`}
        aria-label={`Abrir ${label}. Status: ${status.label}`}
        title={`${label} - ${status.label}`}
      >
        <RoutineStatusIcon status={task.status} />
      </button>
    )
  }

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
