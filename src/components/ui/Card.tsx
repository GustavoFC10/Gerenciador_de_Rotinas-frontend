import type { ReactNode } from 'react'

const cardVariantClass = {
  panel:
    'rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-panel)]',
  metric:
    'rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] shadow-[var(--shadow-panel)]',
  flat: 'border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)]',
  quiet: 'bg-transparent',
}

interface CardProps {
  children: ReactNode
  className?: string
  variant?: keyof typeof cardVariantClass
}

function Card({ children, className = '', variant = 'panel' }: CardProps) {
  return (
    <section
      className={`overflow-hidden ${cardVariantClass[variant] ?? cardVariantClass.panel} ${className}`}
    >
      {children}
    </section>
  )
}

export default Card
