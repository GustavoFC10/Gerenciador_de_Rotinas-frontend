import { routineStatusConfig } from '../../../constants/routineStatus.js'

function RoutineStatusSelect({ value, onChange, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">
        Estado
      </span>
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2 text-sm font-medium text-[var(--color-control-text)] outline-none transition focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
      >
        {Object.entries(routineStatusConfig).map(([status, config]) => (
          <option key={status} value={status}>
            {config.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default RoutineStatusSelect
