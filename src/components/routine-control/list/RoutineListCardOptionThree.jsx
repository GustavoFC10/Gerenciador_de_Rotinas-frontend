import RoutineListExecutionPanel from './RoutineListExecutionPanel.jsx'
import { formatShortDate, routineListStatusTone } from './routineListUtils.js'

function RoutineListCardOptionThree({
  item,
  onOpen,
  onQuickAction,
  onStatusChange,
  onStatusConfirm,
}) {
  const tone = routineListStatusTone[item.displayStatus ?? item.status]

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen?.(item)
        }
      }}
      className={`grid w-full gap-4 border-l-4 px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-control-focus)] xl:grid-cols-[minmax(0,1fr)_100px_150px_300px] xl:items-start ${tone.card} ${tone.border}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] text-sm font-bold ${tone.code}`}
          >
            {item.companyCode}
          </span>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold text-[var(--color-text-strong)]">
              {item.companyName}
            </h4>
            <p className="mt-1 truncate text-sm text-[var(--color-text-muted)]">
              {item.routineName}
            </p>
          </div>
        </div>
      </div>
      <div>
        <span className="block text-xs font-semibold uppercase text-[var(--color-text-subtle)]">
          Prazo
        </span>
        <span className="mt-1 block text-sm font-bold text-[var(--color-text-strong)]">
          {formatShortDate(item.dueDate)}
        </span>
      </div>

      <div className="min-w-0">
        <span className="block text-xs font-semibold uppercase text-[var(--color-text-subtle)]">
          Responsavel
        </span>
        <span className="mt-1 block truncate text-sm font-bold text-[var(--color-text-strong)]">
          {item.assigneeName}
        </span>
      </div>

      <RoutineListExecutionPanel
        item={item}
        onQuickAction={onQuickAction}
        onStatusChange={onStatusChange}
        onStatusConfirm={onStatusConfirm}
      />

      {item.notes && (
        <p className="text-xs leading-5 text-[var(--color-text-subtle)] xl:col-span-4">
          {item.notes}
        </p>
      )}
    </article>
  )
}

export default RoutineListCardOptionThree
