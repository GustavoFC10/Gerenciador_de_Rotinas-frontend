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
      className={`relative m-3 block w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border text-left shadow-sm transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${tone.card}`}
    >
      <div className={`absolute inset-y-0 left-0 w-1.5 ${tone.accent}`} />
      <div className="grid gap-4 p-4 pl-5 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {item.companyCode}
              </p>
              <h4 className="mt-1 truncate text-base font-bold text-slate-950">
                {item.companyName}
              </h4>
            </div>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-700">
            Rotina: {item.routineName}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Codigo {item.companyCode} - {item.departmentName}
          </p>
          <RoutineListNoteField
            item={item}
            onChange={onNoteChange}
            rows={2}
            placeholder="Adicionar observacao..."
            className={`mt-3 ${tone.field}`}
          />
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-lg bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-xs font-semibold uppercase text-slate-400">
                Prazo
              </span>
              <span className="mt-1 block text-sm font-bold text-slate-900">
                {formatShortDate(item.dueDate)}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase text-slate-400">
                Responsavel
              </span>
              <span className="mt-1 block text-sm font-bold text-slate-900">
                {item.assigneeName}
              </span>
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-500">
            {item.indicators.attachments} anexos
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
