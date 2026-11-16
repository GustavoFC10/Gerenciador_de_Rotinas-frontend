import type { ReactNode } from 'react'
import './primitives.css'

const badgeVariantClass = {
  neutral:
    'bg-[var(--color-panel-soft-bg)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-panel-border)]',
  brand:
    'bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-1 ring-[var(--color-brand-border)]',
}

interface BadgeProps {
  children: ReactNode
  className?: string
  variant?: keyof typeof badgeVariantClass
}

function Badge({ children, className = '', variant = 'neutral' }: BadgeProps) {
  return (
    <span
      className={`ui-badge ${badgeVariantClass[variant] ?? badgeVariantClass.neutral} ${className}`}
    >
      {children}
    </span>
  )
}

export default Badge
