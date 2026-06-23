import { routineStatusConfig } from '../../constants/routineStatus.js'

function RoutineStatusSelect({ value, onChange, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
        Estado
      </span>
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
