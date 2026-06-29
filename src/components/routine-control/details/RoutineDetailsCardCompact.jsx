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
    <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] text-[var(--color-text-main)] shadow-[var(--shadow-floating)]">
      <div className="p-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
              {department?.name}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-[var(--color-text-strong)]">
              {routine?.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {client?.code} - {client?.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-[var(--radius-control)] bg-[var(--color-control-bg)] text-lg text-[var(--color-text-muted)] ring-1 ring-[var(--color-control-border)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)]"
            aria-label="Fechar detalhes"
          >
            x
          </button>
        </header>

        <p className="mt-4 text-sm leading-5 text-[var(--color-text-muted)]">
          {routine?.description}
        </p>

        <RoutineEditableFields
          task={task}
          employees={employees}
          onAssigneeChange={onAssigneeChange}
          onDueDateChange={onDueDateChange}
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
