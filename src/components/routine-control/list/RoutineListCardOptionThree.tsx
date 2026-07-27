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
}: {
  item: RoutineListItem
  onOpen?: (item: RoutineListItem) => void
  onQuickAction?: (item: RoutineListItem, action: 'attach') => void
  onNoteChange?: (item: RoutineListItem, notes: string) => void
  onStatusChange?: (item: RoutineListItem, change: PendingStatusChange) => void
  onStatusConfirm?: (item: RoutineListItem) => void
}) {
  const displayStatus = item.displayStatus ?? item.status
  const tone = routineListStatusTone[displayStatus]
  const statusConfig = routineStatusConfig[displayStatus]

  return (
    <article
      className={`grid min-w-0 gap-2 border-l-4 bg-[var(--color-panel-bg)] px-3 py-2.5 transition hover:bg-[var(--color-control-hover-bg)] sm:grid-cols-[minmax(12rem,1fr)_6rem_8rem] sm:items-center xl:grid-cols-[minmax(15rem,1fr)_6rem_9rem_8rem_18rem] ${tone.border}`}
      data-list-card="ledger"
    >
      <button
        type="button"
        onClick={() => onOpen?.(item)}
        className="flex min-w-0 items-center gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
        aria-label={`Abrir detalhes de ${item.primaryLabel ?? item.companyName}`}
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
