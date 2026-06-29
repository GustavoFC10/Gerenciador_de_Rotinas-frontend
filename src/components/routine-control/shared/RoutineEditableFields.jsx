function FieldLabel({ children }) {
  return (
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">
      {children}
    </span>
  )
}

function RoutineEditableFields({
  task,
  employees,
  onAssigneeChange,
  onDueDateChange,
  className = '',
}) {
  const fieldClass =
    'w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-2.5 py-2 text-sm text-[var(--color-control-text)] outline-none focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]'

  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      <label>
        <FieldLabel>Responsavel</FieldLabel>
        <select
          value={task.assigneeId ?? ''}
          onChange={(event) =>
            onAssigneeChange?.(task.id, event.target.value || null)
          }
          className={fieldClass}
        >
          <option value="">Nao atribuido</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <FieldLabel>Prazo especifico</FieldLabel>
        <input
          type="date"
          value={task.dueDate}
          onChange={(event) => onDueDateChange?.(task.id, event.target.value)}
          className={fieldClass}
        />
      </label>
    </div>
  )
}

export default RoutineEditableFields
