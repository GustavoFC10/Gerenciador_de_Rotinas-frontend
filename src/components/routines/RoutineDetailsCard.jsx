import RoutineCardActions from './RoutineCardActions.jsx'
import RoutineEditableFields from './RoutineEditableFields.jsx'

function DetailItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  )
}

function RoutineDetailsCard({
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
  if (!task) {
    return null
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {client?.code} · {department?.name}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {routine?.name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{client?.name}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid size-9 shrink-0 place-items-center rounded-full text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Fechar detalhes"
        >
          ×
        </button>
      </header>

      <div className="p-5 pt-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <DetailItem
            label="Departamento"
            value={department?.name}
          />
          <DetailItem label="Período" value={task.period} />
        </dl>

        <RoutineEditableFields
          task={task}
          employees={employees}
          onAssigneeChange={onAssigneeChange}
          onDueDateChange={onDueDateChange}
          className="mt-4"
        />

        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Descrição da rotina
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {routine?.description}
          </p>
        </div>

        <RoutineCardActions
          task={task}
          onStatusChange={onStatusChange}
          className="mt-4"
        />
      </div>
    </article>
  )
}

export default RoutineDetailsCard
