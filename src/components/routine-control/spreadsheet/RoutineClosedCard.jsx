import { routineStatusConfig } from '../../../constants/routineStatus.js'

function RoutineClosedCard({ task, label, onOpen }) {
  const status = routineStatusConfig[task.status]

  return (
    <button
      type="button"
      className={`group mx-auto block size-5 rounded-full shadow-sm ring-4 ring-white transition hover:scale-125 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${status.dotClass}`}
      onClick={() => onOpen?.(task)}
      aria-label={`Abrir ${label}. Status: ${status.label}`}
      title={`${label} — ${status.label}`}
    />
  )
}

export default RoutineClosedCard
