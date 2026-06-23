import RoutineCardActions from '../shared/RoutineCardActions.jsx'
import RoutineEditableFields from '../shared/RoutineEditableFields.jsx'

function RoutineDetailsCardCompact({
  task,
  client,
  routine,
  department,
  employees,
  onStatusChange,
  onAssigneeChange,
  onDueDateChange,
  onClose,
}) {
  if (!task) return null

  return (
    <article className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-white shadow-2xl">
      <div className="p-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              {department?.name}
            </p>
            <h2 className="mt-2 text-lg font-semibold">{routine?.name}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {client?.code} · {client?.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-md bg-slate-800 text-lg text-slate-400 hover:text-white"
            aria-label="Fechar detalhes"
          >
            ×
          </button>
        </header>

        <p className="mt-4 text-sm leading-5 text-slate-300">
          {routine?.description}
        </p>

        <RoutineEditableFields
          task={task}
          employees={employees}
          onAssigneeChange={onAssigneeChange}
          onDueDateChange={onDueDateChange}
          dark
          className="mt-4"
        />

        <RoutineCardActions
          task={task}
          onStatusChange={onStatusChange}
          variant="compact"
          className="mt-4"
        />
      </div>
    </article>
  )
}

export default RoutineDetailsCardCompact
