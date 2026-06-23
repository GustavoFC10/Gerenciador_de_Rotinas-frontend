import { routineStatusConfig } from '../../constants/routineStatus.js'

function RoutineClosedCardCell({ task, label, onOpen }) {
  const status = routineStatusConfig[task.status]

  return (
    <button
      type="button"
      onClick={() => onOpen?.(task)}
      className={`relative h-10 w-full overflow-hidden rounded-md border transition hover:scale-[1.03] hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${status.surfaceClass}`}
      aria-label={`Abrir ${label}. Status: ${status.label}`}
      title={`${label} — ${status.label}`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1.5 ${status.dotClass}`}
        aria-hidden="true"
      />
      <span className="px-2 text-[9px] font-bold uppercase tracking-wide">
        {status.label}
      </span>
    </button>
  )
}

export default RoutineClosedCardCell
