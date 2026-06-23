import { routineStatusConfig } from '../../../constants/routineStatus.js'

const accountingClosedCardClass = {
  pending: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  in_progress:
    'border-amber-500 bg-amber-500 text-white shadow-amber-100 hover:bg-amber-600',
  error: 'border-red-600 bg-red-600 text-white shadow-red-100 hover:bg-red-700',
  completed:
    'border-emerald-600 bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700',
}

function RoutineClosedCardCompact({ task, label, onOpen }) {
  const status = routineStatusConfig[task.status]
  const colorClass =
    accountingClosedCardClass[task.status] ?? accountingClosedCardClass.pending

  return (
    <button
      type="button"
      onClick={() => onOpen?.(task)}
      className={`flex h-9 w-full items-center justify-center rounded-lg border px-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${colorClass}`}
      aria-label={`Abrir ${label}. Status: ${status.label}`}
      title={`${label} — ${status.label}`}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-wide">
        {status.label}
      </span>
    </button>
  )
}

export default RoutineClosedCardCompact
