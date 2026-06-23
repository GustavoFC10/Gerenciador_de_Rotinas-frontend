import RoutineCardActions from '../shared/RoutineCardActions.jsx'
import RoutineEditableFields from '../shared/RoutineEditableFields.jsx'

function RoutineDetailsCardPanel({
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
    <article className="overflow-hidden rounded-3xl bg-white shadow-2xl shadow-indigo-950/20">
      <header className="bg-indigo-950 px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-5">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
              {department?.name}
            </span>
            <h2 className="mt-2 text-xl font-bold">{routine?.name}</h2>
            <p className="mt-1 text-sm text-indigo-200">
              {client?.code} · {client?.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-white/10 text-xl text-indigo-200 hover:bg-white/20 hover:text-white"
            aria-label="Fechar detalhes"
          >
            ×
          </button>
        </div>
      </header>

      <div className="p-5">
        <RoutineEditableFields
          task={task}
          employees={employees}
          onAssigneeChange={onAssigneeChange}
          onDueDateChange={onDueDateChange}
        />

        <div className="mt-4 rounded-xl border border-slate-100 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Descrição da rotina
          </p>
          <p className="mt-1.5 text-sm leading-5 text-slate-500">
            {routine?.description}
          </p>
        </div>

        <RoutineCardActions
          task={task}
          onStatusChange={onStatusChange}
          variant="panel"
          className="mt-4"
        />
      </div>
    </article>
  )
}

export default RoutineDetailsCardPanel
