import { focusRing } from '../../constants/designTokens.js'

function Select({ label, className = '', children, ...props }) {
  return (
    <label className={`block text-sm font-medium text-[var(--color-text-muted)] ${className}`}>
      {label && <span className="mb-1.5 block">{label}</span>}
      <select
        className={`w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2 text-sm text-[var(--color-control-text)] outline-none transition focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)] ${focusRing}`}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

export default Select
