import { useRef, type KeyboardEvent, type MouseEvent } from 'react'

import { routineStatusConfig } from '../../../constants/routineStatus'
import RoutineListExecutionPanel from './RoutineListExecutionPanel'
import { formatShortDate, routineListStatusTone } from './routineListUtils'
import type {
  PendingStatusChange,
  RoutineListItem,
} from '../../../types/domain'

function RoutineListCardOptionThree({
  item,
  onOpen,
  onQuickAction,
  onStatusChange,
  onStatusConfirm,
  onContextMenuOpen,
  isContextMenuOpen = false,
}: {
  item: RoutineListItem
  onOpen?: (item: RoutineListItem) => void
  onQuickAction?: (item: RoutineListItem, action: 'attach') => void
  onNoteChange?: (item: RoutineListItem, notes: string) => void
  onStatusChange?: (item: RoutineListItem, change: PendingStatusChange) => void
  onStatusConfirm?: (item: RoutineListItem) => void
  onContextMenuOpen?: (
    item: RoutineListItem,
    x: number,
    y: number,
    trigger: HTMLButtonElement,
  ) => void
  isContextMenuOpen?: boolean
}) {
  const openButtonRef = useRef<HTMLButtonElement | null>(null)
  const displayStatus = item.displayStatus ?? item.status
  const tone = routineListStatusTone[displayStatus]
  const statusConfig = routineStatusConfig[displayStatus]
  const hasContextMenu = Boolean(onContextMenuOpen)

  function openContextMenuAtTrigger(trigger: HTMLButtonElement) {
    if (!onContextMenuOpen) return

    const bounds = trigger.getBoundingClientRect()
    onContextMenuOpen(item, bounds.right, bounds.bottom + 4, trigger)
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
      item,
      bounds.left + Math.min(72, bounds.width / 2),
      bounds.top + Math.min(44, bounds.height),
      event.currentTarget,
    )
  }

  function handleContextMenu(event: MouseEvent<HTMLElement>) {
    if (!onContextMenuOpen) return

    const target = event.target

    if (
      target instanceof Element &&
      target.closest('a, input, textarea, select, [contenteditable="true"]')
    ) {
      return
    }

    if (window.getSelection()?.toString().trim()) return

    event.preventDefault()
    onContextMenuOpen(
      item,
      event.clientX,
      event.clientY,
      openButtonRef.current ?? (event.currentTarget as HTMLButtonElement),
    )
  }

  return (
    <article
      onContextMenu={handleContextMenu}
      className={`group/task-context grid min-w-0 gap-2 border-l-4 bg-[var(--color-panel-bg)] px-3 py-2.5 transition hover:bg-[var(--color-control-hover-bg)] sm:grid-cols-[minmax(12rem,1fr)_6rem_8rem] sm:items-center xl:grid-cols-[minmax(15rem,1fr)_6rem_9rem_8rem_18rem] ${tone.border} ${
        isContextMenuOpen
          ? 'bg-[var(--color-control-hover-bg)] ring-2 ring-inset ring-[var(--color-control-focus)]'
          : ''
      }`}
      data-list-card="ledger"
      data-task-context-trigger={isContextMenuOpen || undefined}
    >
      <div className="flex min-w-0 items-center gap-1">
        <button
          ref={openButtonRef}
          type="button"
          onClick={() => onOpen?.(item)}
          onKeyDown={handleKeyboardContextMenu}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
          aria-label={`Abrir detalhes de ${item.primaryLabel ?? item.companyName}`}
          aria-haspopup={hasContextMenu ? 'menu' : undefined}
          aria-expanded={hasContextMenu ? isContextMenuOpen : undefined}
          aria-controls={isContextMenuOpen ? 'task-context-menu' : undefined}
          aria-keyshortcuts={hasContextMenu ? 'Shift+F10' : undefined}
          title={
            hasContextMenu
              ? 'Botão direito ou Shift+F10 para ações da tarefa'
              : undefined
          }
        >
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] text-[11px] font-extrabold ${tone.code}`}
          >
            {item.companyCode}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-[var(--color-text-strong)]">
              {item.primaryLabel ?? item.companyName}
            </span>
          </span>
        </button>

        {hasContextMenu && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              openContextMenuAtTrigger(event.currentTarget)
            }}
            className={`grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel-bg)] hover:text-[var(--color-text-strong)] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-control-focus)] ${
              isContextMenuOpen
                ? 'opacity-100'
                : 'opacity-0 group-hover/task-context:opacity-100 group-focus-within/task-context:opacity-100'
            }`}
            aria-label={`Ações de ${item.primaryLabel ?? item.companyName}`}
            aria-haspopup="menu"
            aria-expanded={isContextMenuOpen}
            aria-controls={isContextMenuOpen ? 'task-context-menu' : undefined}
            title="Ações da tarefa"
          >
            <MoreIcon />
          </button>
        )}
      </div>

      <LedgerValue label="Prazo" value={formatShortDate(item.dueDate)} />
      <LedgerValue label="Responsável" value={item.assigneeName} desktopOnly />

      <div className="min-w-0">
        <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-subtle)] xl:hidden">
          Estado
        </span>
        <span
          className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold ${statusConfig.surfaceClass}`}
        >
          <span
            className={`size-2 shrink-0 rounded-full ${statusConfig.dotClass}`}
          />
          <span className="truncate">{statusConfig.label}</span>
        </span>
      </div>

      <RoutineListExecutionPanel
        item={item}
        onQuickAction={onQuickAction}
        onStatusChange={onStatusChange}
        onStatusConfirm={onStatusConfirm}
        className="sm:col-span-3 xl:col-span-1"
      />
    </article>
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

function LedgerValue({
  label,
  value,
  desktopOnly = false,
}: {
  label: string
  value: string
  desktopOnly?: boolean
}) {
  return (
    <div className={`min-w-0 ${desktopOnly ? 'hidden xl:block' : ''}`}>
      <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-subtle)] xl:hidden">
        {label}
      </span>
      <span className="block truncate text-xs font-bold text-[var(--color-text-strong)]">
        {value}
      </span>
    </div>
  )
}

export default RoutineListCardOptionThree
