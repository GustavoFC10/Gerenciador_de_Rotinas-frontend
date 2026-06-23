function FieldLabel({ children, dark = false }) {
  return (
    <span
      className={`mb-1 block text-[10px] font-semibold uppercase tracking-wide ${
        dark ? 'text-slate-500' : 'text-slate-400'
      }`}
    >
      {children}
    </span>
  )
}

function RoutineEditableFields({
  task,
  employees,
  onAssigneeChange,
  onDueDateChange,
  dark = false,
  className = '',
}) {
  const fieldClass = dark
    ? 'border-slate-700 bg-slate-800 text-white'
    : 'border-slate-300 bg-white text-slate-700'

  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      <label>
        <FieldLabel dark={dark}>Responsável</FieldLabel>
        <select
          value={task.assigneeId ?? ''}
          onChange={(event) =>
            onAssigneeChange?.(task.id, event.target.value || null)
          }
          className={`w-full rounded-lg border px-2.5 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${fieldClass}`}
        >
          <option value="">Não atribuído</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <FieldLabel dark={dark}>Prazo específico</FieldLabel>
        <input
          type="date"
          value={task.dueDate}
          onChange={(event) => onDueDateChange?.(task.id, event.target.value)}
          className={`w-full rounded-lg border px-2.5 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${fieldClass}`}
        />
      </label>
    </div>
  )
}

export default RoutineEditableFields
