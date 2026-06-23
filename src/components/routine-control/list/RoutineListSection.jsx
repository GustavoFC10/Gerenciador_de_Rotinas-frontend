import { useState } from 'react'

import { routineStatusConfig } from '../../../constants/routineStatus.js'

const sectionStyles = {
  compact: {
    section: 'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm',
    header:
      'border-b border-slate-100 bg-slate-50 px-4 py-3 hover:bg-slate-100',
    body: 'divide-y divide-slate-100',
    count: 'bg-white text-slate-500 ring-1 ring-slate-200',
    icon: 'text-slate-500',
  },
  cards: {
    section:
      'overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm shadow-blue-900/5',
    header:
      'border-b border-blue-50 bg-white px-5 py-4 hover:bg-blue-50/60',
    body: 'bg-blue-50/30',
    count: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
    icon: 'text-blue-600',
  },
  ledger: {
    section: 'border-b border-zinc-300 bg-white last:border-b-0',
    header:
      'border-b border-zinc-200 bg-zinc-100 px-4 py-2.5 hover:bg-zinc-200/70',
    body: 'divide-y divide-zinc-200',
    count: 'bg-white text-zinc-600 ring-1 ring-zinc-300',
    icon: 'text-zinc-600',
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
          <span className="text-sm font-bold text-slate-800">
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
