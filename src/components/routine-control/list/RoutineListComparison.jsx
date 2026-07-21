import { useMemo, useState } from 'react'

import RoutineListCardOptionOne from './RoutineListCardOptionOne.jsx'
import RoutineListSection from './RoutineListSection.jsx'
import { groupRoutineListItemsByStatus } from './routineListUtils.js'

const listPresentation = {
  Card: RoutineListCardOptionOne,
  sectionVariant: 'compact',
  shellClass: 'bg-[var(--color-list-panel-bg)]',
  shellNoHeaderClass: 'bg-transparent',
  headerClass:
    'border-b border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] px-5 py-4 sm:px-6',
  eyebrowClass: 'text-[var(--color-brand)]',
  contentClass: 'space-y-3 bg-[var(--color-list-bg)] p-4 sm:p-5',
  noHeaderContentClass:
    'space-y-2 rounded-[var(--radius-panel)] border border-[var(--color-list-border)] bg-[var(--color-list-bg)] p-3 sm:p-4',
}

function normalizeSearchValue(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function itemMatchesSearch(item, term) {
  const normalizedTerm = normalizeSearchValue(term).trim()

  if (!normalizedTerm) return true

  return [
    item.companyCode,
    item.companyName,
    item.routineName,
    item.assigneeName,
    item.departmentName,
    item.statusDetailLabel,
    item.period,
    item.notes,
  ].some((value) => normalizeSearchValue(value).includes(normalizedTerm))
}

function RoutineListComparison({
  title,
  description,
  items,
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onItemStatusChange,
  showHeader = true,
}) {
  const [pendingChangeById, setPendingChangeById] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const groupedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      pendingChange: pendingChangeById[item.id],
      displayStatus: pendingChangeById[item.id]?.status ?? item.status,
    }))
  }, [items, pendingChangeById])
  const visibleItems = useMemo(
    () => groupedItems.filter((item) => itemMatchesSearch(item, searchTerm)),
    [groupedItems, searchTerm],
  )
  const groups = useMemo(
    () => groupRoutineListItemsByStatus(visibleItems),
    [visibleItems],
  )

  const SelectedCard = listPresentation.Card
  const contentClass = showHeader
    ? listPresentation.contentClass
    : listPresentation.noHeaderContentClass
  const shellClass = showHeader
    ? listPresentation.shellClass
    : listPresentation.shellNoHeaderClass

  function handlePendingStatusChange(item, change) {
    const nextChange = normalizePendingChange(change)

    if (!nextChange.status) return

    setPendingChangeById((current) => {
      const next = { ...current }

      if (
        nextChange.status === item.status &&
        normalizeStatusDetail(nextChange.statusDetail) ===
          normalizeStatusDetail(item.statusDetail)
      ) {
        delete next[item.id]
      } else {
        next[item.id] = nextChange
      }

      return next
    })
  }

  function handlePendingStatusCancel(item) {
    setPendingChangeById((current) => {
      const next = { ...current }
      delete next[item.id]
      return next
    })
  }

  function handlePendingStatusConfirm(item) {
    if (!item.pendingChange) return

    onItemStatusChange?.(item, item.pendingChange)
    handlePendingStatusCancel(item)
  }

  return (
    <section
      className={`overflow-hidden ${showHeader ? 'rounded-2xl' : ''} ${shellClass}`}
    >
      {showHeader && (
        <header className={listPresentation.headerClass}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-[0.18em] ${listPresentation.eyebrowClass}`}
              >
                Lista operacional
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                {title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">
                {description}
              </p>
            </div>
          </div>
        </header>
      )}

      {!showHeader && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <ListSearchInput value={searchTerm} onChange={setSearchTerm} />
        </div>
      )}

      {showHeader && (
        <div className="border-x border-[var(--color-list-border)] bg-[var(--color-list-bg)] px-4 py-3 sm:px-5">
          <ListSearchInput value={searchTerm} onChange={setSearchTerm} />
        </div>
      )}

      <div className={contentClass}>
        {groups.map((group) => (
          <RoutineListSection
            key={group.status}
            group={group}
            variant={listPresentation.sectionVariant}
          >
            {group.items.map((item) => (
              <SelectedCard
                key={item.id}
                item={item}
                onOpen={onItemOpen}
                onQuickAction={onItemQuickAction}
                onNoteChange={onItemNoteChange}
                onStatusChange={handlePendingStatusChange}
                onStatusConfirm={handlePendingStatusConfirm}
              />
            ))}
          </RoutineListSection>
        ))}
      </div>
    </section>
  )
}

function ListSearchInput({ value, onChange }) {
  return (
    <label className="min-w-56 flex-1">
      <span className="sr-only">Buscar nesta lista</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar nesta lista"
        className="min-h-9 w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 text-sm text-[var(--color-control-text)] outline-none transition placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
      />
    </label>
  )
}

function normalizePendingChange(change) {
  if (typeof change === 'string') {
    return { status: change, statusDetail: null }
  }

  return {
    status: change?.status,
    statusDetail: change?.statusDetail ?? null,
  }
}

function normalizeStatusDetail(detail) {
  return detail ?? ''
}

export default RoutineListComparison
