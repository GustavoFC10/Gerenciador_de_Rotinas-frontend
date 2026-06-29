import { focusRing } from '../../constants/designTokens.js'

function Textarea({ label, className = '', ...props }) {
  return (
    <label className={`block text-sm font-medium text-[var(--color-text-muted)] ${className}`}>
      {label && <span className="mb-1.5 block">{label}</span>}
      <textarea
        className={`w-full resize-y rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2 text-sm text-[var(--color-control-text)] outline-none transition placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)] ${focusRing}`}
        {...props}
      />
    </label>
  )
}

export default Textarea
