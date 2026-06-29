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
    <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-floating)]">
      <header className="bg-[var(--color-brand)] px-5 py-4 text-[var(--color-button-primary-text)]">
        <div className="flex items-start justify-between gap-5">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide opacity-75">
              {department?.name}
            </span>
            <h2 className="mt-2 text-xl font-bold">{routine?.name}</h2>
            <p className="mt-1 text-sm opacity-80">
              {client?.code} - {client?.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-[var(--color-brand-soft)] text-xl text-[var(--color-brand)] hover:bg-[var(--color-accent-soft)]"
            aria-label="Fechar detalhes"
          >
            x
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

        <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">
            Descricao da rotina
          </p>
          <p className="mt-1.5 text-sm leading-5 text-[var(--color-text-muted)]">
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
