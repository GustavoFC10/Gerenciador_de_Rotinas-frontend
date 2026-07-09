import RoutineListExecutionPanel from './RoutineListExecutionPanel.jsx'
import { formatShortDate, routineListStatusTone } from './routineListUtils.js'

function RoutineListCardOptionOne({
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
      className={`grid w-full gap-3 border-l-4 px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-control-focus)] lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start ${tone.card} ${tone.border}`}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 gap-3">
          <div
            className={`grid size-12 shrink-0 place-items-center rounded-[var(--radius-control)] text-sm font-bold ${tone.code}`}
          >
            {item.companyCode}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="truncate text-base font-bold text-[var(--color-text-strong)]">
              {item.primaryLabel ?? item.companyName}
            </h4>
            <div className="mt-1 grid gap-2 text-sm text-[var(--color-text-muted)] sm:grid-cols-3">
              <span>
                <span className="font-semibold text-[var(--color-text-subtle)]">
                  Prazo:
                </span>{' '}
                {formatShortDate(item.dueDate)}
              </span>
              <span className="truncate">
                <span className="font-semibold text-[var(--color-text-subtle)]">
                  Resp.:
                </span>{' '}
                {item.assigneeName}
              </span>
              <span>
                <span className="font-semibold text-[var(--color-text-subtle)]">
                  Periodo:
                </span>{' '}
                {item.period}
              </span>
            </div>
          </div>
        </div>

      
      </div>

      <RoutineListExecutionPanel
        item={item}
        onQuickAction={onQuickAction}
        onStatusChange={onStatusChange}
        onStatusConfirm={onStatusConfirm}
      />
    </article>
  )
}

export default RoutineListCardOptionOne
