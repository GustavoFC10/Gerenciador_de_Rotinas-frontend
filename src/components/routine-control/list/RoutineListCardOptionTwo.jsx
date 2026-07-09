import RoutineListExecutionPanel from './RoutineListExecutionPanel.jsx'
import RoutineListNoteField from './RoutineListNoteField.jsx'
import { formatShortDate, routineListStatusTone } from './routineListUtils.js'

function RoutineListCardOptionTwo({
  item,
  onOpen,
  onQuickAction,
  onNoteChange,
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
      className={`relative m-3 block w-[calc(100%-1.5rem)] overflow-hidden rounded-[var(--radius-panel)] border text-left shadow-[var(--shadow-panel)] transition hover:shadow-[var(--shadow-floating)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)] ${tone.card}`}
    >
      <div className={`absolute inset-y-0 left-0 w-1.5 ${tone.accent}`} />
      <div className="grid gap-4 p-4 pl-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">
                {item.companyCode}
              </p>
              <h4 className="mt-1 truncate text-base font-bold text-[var(--color-text-strong)]">
                {item.companyName}
              </h4>
            </div>
            <div className="rounded-full border border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] px-3 py-1 text-xs font-bold text-[var(--color-text-muted)]">
              {formatShortDate(item.dueDate)}
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-[var(--color-text-muted)] sm:grid-cols-3">
            <span className="truncate">
              <span className="font-semibold text-[var(--color-text-subtle)]">
                Rotina:
              </span>{' '}
              {item.routineName}
            </span>
            <span className="truncate">
              <span className="font-semibold text-[var(--color-text-subtle)]">
                Responsavel:
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

          <RoutineListNoteField
            item={item}
            onChange={onNoteChange}
            rows={2}
            placeholder="Observacao complementar..."
            className={`mt-4 ${tone.field}`}
          />
        </div>

        <RoutineListExecutionPanel
          item={item}
          onQuickAction={onQuickAction}
          onStatusChange={onStatusChange}
          onStatusConfirm={onStatusConfirm}
        />
      </div>
    </article>
  )
}

export default RoutineListCardOptionTwo
