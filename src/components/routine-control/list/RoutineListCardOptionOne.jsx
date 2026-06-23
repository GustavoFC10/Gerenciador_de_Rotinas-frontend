import RoutineListQuickActions from './RoutineListQuickActions.jsx'
import { formatShortDate, routineListStatusTone } from './routineListUtils.js'

function RoutineListCardOptionOne({ item, onOpen, onQuickAction }) {
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
      className={`grid w-full gap-3 border-l-4 px-4 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600 md:grid-cols-[72px_minmax(0,1fr)_auto] md:items-center ${tone.card} ${tone.border}`}
    >
      <div className={`rounded-lg px-2 py-1 ${tone.code}`}>
        <span className="block text-xs font-bold uppercase text-slate-400">
          Codigo
        </span>
        <span className="mt-0.5 block text-base font-bold">
          {item.companyCode}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="truncate text-sm font-bold text-slate-950">
            {item.companyName}
          </h4>
        </div>
        <p className="mt-1 truncate text-sm text-slate-500">
          Responsavel: {item.assigneeName}
        </p>
        {item.notes && (
          <p className="mt-1 line-clamp-1 text-xs text-slate-400">
            {item.notes}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        <div className="text-sm">
          <span className="block text-xs font-semibold uppercase text-slate-400">
            Prazo
          </span>
          <span className="font-bold text-slate-800">
            {formatShortDate(item.dueDate)}
          </span>
        </div>
        <div className="min-w-20 text-sm">
          <span className="block text-xs font-semibold uppercase text-slate-400">
            Anexos
          </span>
          <span className="font-medium text-slate-700">
            {item.indicators.attachments}
          </span>
        </div>
        <RoutineListQuickActions
          item={item}
          actions={['attach']}
          onAction={onQuickAction}
        />
      </div>
    </article>
  )
}

export default RoutineListCardOptionOne
