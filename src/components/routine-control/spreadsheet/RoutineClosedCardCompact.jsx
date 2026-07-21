import {
  ROUTINE_STATUS,
  routineStatusConfig,
} from '../../../constants/routineStatus.js'

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
        <StatusIcon status={task.status} />
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

function StatusIcon({ status }) {
  if (status === ROUTINE_STATUS.COMPLETED) return <CheckIcon />
  if (status === ROUTINE_STATUS.ERROR) return <AlertIcon />
  if (status === ROUTINE_STATUS.IN_PROGRESS) return <ClockIcon />
  if (status === ROUTINE_STATUS.NO_MOVEMENT) return <MinusIcon />
  if (status === ROUTINE_STATUS.NOT_APPLICABLE) return <XIcon />
  return <PendingIcon />
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="m5 12.5 4.2 4.2L19 7"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M12 4 21 20H3L12 4Z" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 9v5" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 17h.01" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function PendingIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M8 5.5h8A2.5 2.5 0 0 1 18.5 8v8a2.5 2.5 0 0 1-2.5 2.5H8A2.5 2.5 0 0 1 5.5 16V8A2.5 2.5 0 0 1 8 5.5Z"
        strokeWidth="1.9"
      />
      <path d="M9 10h6" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 14h4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="7" strokeWidth="2" />
      <path
        d="M12 8.5V12l2.8 1.8"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M6 12h12" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="m7 7 10 10M17 7 7 17" strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  )
}

export default RoutineClosedCardCompact
