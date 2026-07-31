import { useState } from 'react'

import { routineStatusConfig } from '../../../constants/routineStatus'
import type { ReactNode } from 'react'
import type { RoutineListGroup } from '../../../types/domain'

function RoutineListSection({
  group,
  children,
}: {
  group: RoutineListGroup
  children: ReactNode
  variant?: string
}) {
  const [isOpen, setIsOpen] = useState(group.defaultOpen ?? true)
  const statusConfig = routineStatusConfig[group.status]

  return (
    <section className="border-b border-[var(--color-list-border)] bg-[var(--color-list-section-bg)] last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-[var(--color-list-border)] bg-[var(--color-list-section-header-bg)] px-4 py-2.5 text-left transition hover:bg-[var(--color-list-section-hover-bg)]"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <span
            className={`size-2.5 rounded-full ${statusConfig?.dotClass ?? ''}`}
          />
          <span className="text-sm font-bold text-[var(--color-text-main)]">
            {group.label}
          </span>
          {group.meta && (
            <span className="hidden text-xs font-medium text-[var(--color-text-subtle)] sm:inline">
              {group.meta}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--color-list-panel-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-muted)] ring-1 ring-[var(--color-list-border)]">
            {group.items.length}
          </span>
          <span className="grid size-7 place-items-center rounded-full text-sm font-bold text-[var(--color-text-muted)]">
            {isOpen ? '-' : '+'}
          </span>
        </span>
      </button>
      {isOpen && (
        <div className="divide-y divide-[var(--color-list-border)]">
          {children}
        </div>
      )}
    </section>
  )
}

export default RoutineListSection
