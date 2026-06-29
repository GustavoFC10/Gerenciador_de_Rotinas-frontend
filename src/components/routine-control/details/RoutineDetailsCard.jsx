import RoutineCardActions from '../shared/RoutineCardActions.jsx'
import RoutineEditableFields from '../shared/RoutineEditableFields.jsx'

function DetailItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-[var(--color-text-strong)]">
        {value}
      </dd>
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
    <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-floating)]">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--color-divider)] px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
            {client?.code} - {department?.name}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-strong)]">
            {routine?.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {client?.name}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid size-9 shrink-0 place-items-center rounded-full text-xl text-[var(--color-text-muted)] transition hover:bg-[var(--color-panel-soft-bg)] hover:text-[var(--color-text-strong)]"
          aria-label="Fechar detalhes"
        >
          x
        </button>
      </header>

      <div className="p-5 pt-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <DetailItem label="Departamento" value={department?.name} />
          <DetailItem label="Periodo" value={task.period} />
        </dl>

        <RoutineEditableFields
          task={task}
          employees={employees}
          onAssigneeChange={onAssigneeChange}
          onDueDateChange={onDueDateChange}
          className="mt-4"
        />

        <div className="mt-4 rounded-[var(--radius-control)] bg-[var(--color-panel-soft-bg)] p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">
            Descricao da rotina
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
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
