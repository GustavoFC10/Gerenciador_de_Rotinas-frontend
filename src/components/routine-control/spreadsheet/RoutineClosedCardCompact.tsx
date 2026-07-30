import {
  ROUTINE_STATUS,
  routineStatusConfig,
} from '../../../constants/routineStatus'
import RoutineStatusIcon from '../shared/RoutineStatusIcon'
import type { RoutineStatus, Task } from '../../../types/domain'
import type { KeyboardEvent, MouseEvent } from 'react'

const roundCellClass: Record<RoutineStatus, string> = {
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
}

function RoutineClosedCardCompact({
  task,
  label,
  onOpen,
  onContextMenuOpen,
  isContextMenuOpen = false,
}: {
  task: Task
  label: string
  onOpen?: (task: Task) => void
  onContextMenuOpen?: (
    task: Task,
    label: string,
    x: number,
    y: number,
    trigger: HTMLButtonElement,
  ) => void
  isContextMenuOpen?: boolean
}) {
  const status =
    routineStatusConfig[task.status] ??
    routineStatusConfig[ROUTINE_STATUS.PENDING]

  const colorClass = roundCellClass[task.status]
  const hasContextMenu = Boolean(onContextMenuOpen)

  function openMenuFromTrigger(trigger: HTMLButtonElement) {
    if (!onContextMenuOpen) return

    const bounds = trigger.getBoundingClientRect()
    onContextMenuOpen(task, label, bounds.right, bounds.bottom + 4, trigger)
  }

  function handleKeyboardContextMenu(event: KeyboardEvent<HTMLButtonElement>) {
    if (
      !onContextMenuOpen ||
      (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10'))
    ) {
      return
    }

    event.preventDefault()
    const bounds = event.currentTarget.getBoundingClientRect()
    onContextMenuOpen(
      task,
      label,
      bounds.left + bounds.width / 2,
      bounds.top + bounds.height / 2,
      event.currentTarget,
    )
  }

  function handleContextMenu(event: MouseEvent<HTMLButtonElement>) {
    if (!onContextMenuOpen) return

    event.preventDefault()
    onContextMenuOpen(
      task,
      label,
      event.clientX,
      event.clientY,
      event.currentTarget,
    )
  }

  return (
    <div
      className="group/task-context relative mx-auto w-fit"
      data-task-context-trigger={isContextMenuOpen || undefined}
    >
      <button
        type="button"
        onClick={() => onOpen?.(task)}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyboardContextMenu}
        className={`relative grid size-9 place-items-center rounded-full shadow-[var(--shadow-panel)] transition hover:z-10 hover:scale-125 hover:shadow-[var(--shadow-floating)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${
          isContextMenuOpen
            ? 'z-10 ring-2 ring-[var(--color-control-focus)] ring-offset-2 ring-offset-[var(--color-table-cell-bg)]'
            : ''
        } ${colorClass}`}
        aria-label={`Abrir ${label}. Status: ${status.label}`}
        aria-haspopup={hasContextMenu ? 'menu' : undefined}
        aria-expanded={hasContextMenu ? isContextMenuOpen : undefined}
        aria-controls={isContextMenuOpen ? 'task-context-menu' : undefined}
        aria-keyshortcuts={hasContextMenu ? 'Shift+F10' : undefined}
        title={`${label} — ${status.label}${hasContextMenu ? '. Botão direito ou Shift+F10 para ações' : ''}`}
      >
        <RoutineStatusIcon status={task.status} />
      </button>

      
    </div>
  )
}

function MoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  )
}

export default RoutineClosedCardCompact
