import RoutineListNoteField from './RoutineListNoteField.jsx'
import RoutineListQuickActions from './RoutineListQuickActions.jsx'
import { formatShortDate, routineListStatusTone } from './routineListUtils.js'

function RoutineListCardOptionTwo({
  item,
  onOpen,
  onQuickAction,
  onNoteChange,
}) {
  const tone = routineListStatusTone[item.status]

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
      <div className="grid gap-4 p-4 pl-5 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">
                {item.companyCode}
              </p>
              <h4 className="mt-1 truncate text-base font-bold text-[var(--color-text-strong)]">
                {item.companyName}
              </h4>
            </div>
          </div>
          <p className="mt-2 text-sm font-medium text-[var(--color-text-muted)]">
            Rotina: {item.routineName}
         
          </p>
          
          
          <RoutineListNoteField
            item={item}
            onChange={onNoteChange}
            rows={3}
            placeholder="Adicionar observacao..."
            className={`mt-3 ${tone.field}`}
          />
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-[var(--radius-control)] bg-[var(--color-list-muted-bg)] p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-xs font-semibold uppercase text-[var(--color-text-subtle)]">
                Prazo
              </span>
              <span className="mt-1 block text-sm font-bold text-[var(--color-text-strong)]">
                {formatShortDate(item.dueDate)}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase text-[var(--color-text-subtle)]">
                Responsavel
              </span>
              <span className="mt-1 block text-sm font-bold text-[var(--color-text-strong)]">
                {item.assigneeName}
              </span>
              
            </div>
          </div>
          
          <RoutineListQuickActions
            item={item}
            actions={['attach']}
            onAction={onQuickAction}
          />
        </div>
      </div>
    </article>
  )
}

export default RoutineListCardOptionTwo
