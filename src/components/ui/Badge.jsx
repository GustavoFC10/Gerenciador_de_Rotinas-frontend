const badgeVariantClass = {
  neutral:
    'bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-panel-border)]',
  brand:
    'bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-1 ring-[var(--color-accent)]',
}

function Badge({ children, className = '', variant = 'neutral' }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full px-2 text-xs font-bold ${badgeVariantClass[variant] ?? badgeVariantClass.neutral} ${className}`}
    >
      {children}
    </span>
  )
}

export default Badge
