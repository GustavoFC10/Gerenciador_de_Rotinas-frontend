import type { ReactNode } from 'react'

const badgeVariantClass = {
  neutral:
    'bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-panel-border)]',
  brand:
    'bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-1 ring-[var(--color-accent)]',
}

interface BadgeProps {
  children: ReactNode
  className?: string
  variant?: keyof typeof badgeVariantClass
}

function Badge({ children, className = '', variant = 'neutral' }: BadgeProps) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full px-2 text-xs font-bold ${badgeVariantClass[variant] ?? badgeVariantClass.neutral} ${className}`}
    >
      {children}
    </span>
  )
}

export default Badge
