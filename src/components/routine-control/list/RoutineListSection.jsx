import { useState } from 'react'

import { routineStatusConfig } from '../../../constants/routineStatus.js'

const sectionStyles = {
  compact: {
    section:
      'overflow-hidden rounded-md border border-[var(--color-list-border)] bg-[var(--color-list-section-bg)] shadow-[var(--shadow-panel)]',
    header:
      'border-b border-[var(--color-list-border)] bg-[var(--color-list-section-header-bg)] px-3 py-2.5 hover:bg-[var(--color-list-section-hover-bg)]',
    body: 'divide-y divide-[var(--color-list-border)]',
    count:
      'bg-[var(--color-list-panel-bg)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-list-border)]',
    icon: 'text-[var(--color-text-muted)]',
    label: 'text-[var(--color-text-main)]',
  },
  cards: {
    section:
      'overflow-hidden rounded-2xl border border-[var(--color-list-border)] bg-[var(--color-list-section-bg)] shadow-[var(--shadow-panel)]',
    header:
      'border-b border-[var(--color-list-border)] bg-[var(--color-list-section-bg)] px-5 py-4 hover:bg-[var(--color-list-section-hover-bg)]',
    body: 'bg-[var(--color-list-muted-bg)]',
    count:
      'bg-[var(--color-brand-soft)] text-[var(--color-brand)] ring-1 ring-[var(--color-brand)]',
    icon: 'text-[var(--color-brand)]',
    label: 'text-[var(--color-text-main)]',
  },
  ledger: {
    section:
      'border-b border-[var(--color-list-border)] bg-[var(--color-list-section-bg)] last:border-b-0',
    header:
      'border-b border-[var(--color-list-border)] bg-[var(--color-list-section-header-bg)] px-4 py-2.5 hover:bg-[var(--color-list-section-hover-bg)]',
    body: 'divide-y divide-[var(--color-list-border)]',
    count:
      'bg-[var(--color-list-panel-bg)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-list-border)]',
    icon: 'text-[var(--color-text-muted)]',
    label: 'text-[var(--color-text-main)]',
  },
}

function RoutineListSection({ group, children, variant = 'compact' }) {
  const [isOpen, setIsOpen] = useState(true)
  const statusConfig = routineStatusConfig[group.status]
  const styles = sectionStyles[variant] ?? sectionStyles.compact

  return (
    <section className={styles.section}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`flex min-h-12 w-full items-center justify-between gap-3 text-left transition ${styles.header}`}
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${statusConfig.dotClass}`} />
          <span className={`text-sm font-bold ${styles.label}`}>
            {group.label}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles.count}`}
          >
            {group.items.length}
          </span>
          <span
            className={`grid size-7 place-items-center rounded-full text-sm font-bold ${styles.icon}`}
          >
            {isOpen ? '-' : '+'}
          </span>
        </span>
      </button>
      {isOpen && <div className={styles.body}>{children}</div>}
    </section>
  )
}

export default RoutineListSection
