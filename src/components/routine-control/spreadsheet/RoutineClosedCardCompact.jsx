import {
  ROUTINE_STATUS,
  routineStatusConfig,
} from '../../../constants/routineStatus.js'
import RoutineStatusIcon from '../shared/RoutineStatusIcon.jsx'

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

function RoutineClosedCardCompact({ task, label, onOpen }) {
  const status =
    routineStatusConfig[task.status] ??
    routineStatusConfig[ROUTINE_STATUS.PENDING]

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

export default RoutineClosedCardCompact
