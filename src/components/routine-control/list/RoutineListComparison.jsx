import { useMemo, useState } from 'react'

import {
  ROUTINE_STATUS,
  routineStatusConfig,
} from '../../../constants/routineStatus.js'
import RoutineListCardOptionOne from './RoutineListCardOptionOne.jsx'
import RoutineListCardOptionThree from './RoutineListCardOptionThree.jsx'
import RoutineListCardOptionTwo from './RoutineListCardOptionTwo.jsx'
import RoutineListSection from './RoutineListSection.jsx'
import {
  ROUTINE_LIST_PRESENTATION,
  groupRoutineListItemsByFlow,
  groupRoutineListItemsByStatus,
} from './routineListUtils.js'

const listPresentations = {
  [ROUTINE_LIST_PRESENTATION.OPERATIONAL]: {
    Card: RoutineListCardOptionOne,
    groupItems: groupRoutineListItemsByStatus,
    sectionVariant: 'compact',
    shellClass: 'bg-[var(--color-list-panel-bg)]',
    shellNoHeaderClass: 'bg-transparent',
    headerClass:
      'border-b border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] px-5 py-4 sm:px-6',
    eyebrowClass: 'text-[var(--color-brand)]',
    contentClass: 'space-y-3 bg-[var(--color-list-bg)] p-4 sm:p-5',
    noHeaderContentClass:
      'space-y-2 rounded-[var(--radius-panel)] border border-[var(--color-list-border)] bg-[var(--color-list-bg)] p-3 sm:p-4',
  },
  [ROUTINE_LIST_PRESENTATION.TRACKING]: {
    Card: RoutineListCardOptionTwo,
    groupItems: groupRoutineListItemsByFlow,
    sectionVariant: 'cards',
    overviewVariant: 'flow',
    shellClass: 'bg-[var(--color-panel-soft-bg)]',
    shellNoHeaderClass: 'bg-transparent',
    headerClass:
      'border-b border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] px-5 py-4 sm:px-6',
    eyebrowClass: 'text-[var(--color-brand)]',
    contentClass: 'space-y-4 bg-[var(--color-panel-soft-bg)] p-4 sm:p-5',
    noHeaderContentClass:
      'space-y-4 rounded-[var(--radius-panel)] border border-[var(--color-list-border)] bg-[var(--color-panel-soft-bg)] p-3 sm:p-4',
  },
  [ROUTINE_LIST_PRESENTATION.LEDGER]: {
    Card: RoutineListCardOptionThree,
    groupItems: groupRoutineListItemsByStatus,
    sectionVariant: 'ledger',
    overviewVariant: 'ledger',
    showColumnHeader: true,
    shellClass: 'bg-[var(--color-list-panel-bg)]',
    shellNoHeaderClass: 'bg-transparent',
    headerClass:
      'border-b border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] px-5 py-4 sm:px-6',
    eyebrowClass: 'text-[var(--color-brand)]',
    contentClass:
      'overflow-hidden bg-[var(--color-list-panel-bg)] shadow-[var(--shadow-panel)]',
    noHeaderContentClass:
      'overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] shadow-[var(--shadow-panel)]',
  },
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
    item.primaryLabel,
    item.companyCode,
    item.companyName,
    item.routineName,
    item.assigneeName,
    item.departmentName,
    item.statusDetailLabel,
    item.period,
    item.dueDate,
    item.notes,
  ].some((value) => normalizeSearchValue(value).includes(normalizedTerm))
}

function RoutineListComparison({
  title,
  description,
  items,
  viewMode = ROUTINE_LIST_PRESENTATION.OPERATIONAL,
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onItemStatusChange,
  showHeader = true,
}) {
  const [pendingChangeById, setPendingChangeById] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const presentation =
    listPresentations[viewMode] ??
    listPresentations[ROUTINE_LIST_PRESENTATION.OPERATIONAL]
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
    () => presentation.groupItems(visibleItems),
    [presentation, visibleItems],
  )

  const SelectedCard = presentation.Card
  const contentClass = showHeader
    ? presentation.contentClass
    : presentation.noHeaderContentClass
  const shellClass = showHeader
    ? presentation.shellClass
    : presentation.shellNoHeaderClass

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
      data-list-view={viewMode}
    >
      {showHeader && (
        <header className={presentation.headerClass}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-[0.18em] ${presentation.eyebrowClass}`}
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

      {presentation.overviewVariant && (
        <ListOverview
          variant={presentation.overviewVariant}
          groups={groups}
          items={visibleItems}
        />
      )}

      <div className={contentClass}>
        {presentation.showColumnHeader && <LedgerColumnHeader />}

        {groups.length > 0 ? (
          groups.map((group) => (
            <RoutineListSection
              key={group.key ?? group.status}
              group={group}
              variant={presentation.sectionVariant}
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
          ))
        ) : (
          <ListEmptyState searchTerm={searchTerm} />
        )}
      </div>
    </section>
  )
}

function ListOverview({ variant, groups, items }) {
  if (variant === 'flow') {
    return (
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {groups.map((group) => {
          const statusConfig = routineStatusConfig[group.status]

          return (
            <div
              key={group.key}
              className="flex min-w-0 items-center gap-3 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-3 py-2.5 shadow-[var(--shadow-panel)]"
            >
              <span
                className={`size-3 shrink-0 rounded-full ${statusConfig.dotClass}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-subtle)]">
                  {group.label}
                </span>
                <span className="block text-lg font-black leading-5 text-[var(--color-text-strong)]">
                  {group.items.length}
                </span>
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  const errorCount = items.filter(
    (item) => item.status === ROUTINE_STATUS.ERROR,
  ).length
  const activeCount = items.filter(
    (item) => item.status === ROUTINE_STATUS.IN_PROGRESS,
  ).length
  const pendingCount = items.filter(
    (item) => item.status === ROUTINE_STATUS.PENDING,
  ).length
  const unassignedCount = items.filter((item) => !item.assigneeId).length

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-soft-bg)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
      <OverviewMetric value={items.length} label="itens" />
      <OverviewDivider />
      <OverviewMetric value={errorCount} label="com erro" />
      <OverviewDivider />
      <OverviewMetric value={activeCount} label="em andamento" />
      <OverviewDivider />
      <OverviewMetric value={pendingCount} label="pendentes" />
      {unassignedCount > 0 && (
        <>
          <OverviewDivider />
          <OverviewMetric value={unassignedCount} label="sem responsável" />
        </>
      )}
    </div>
  )
}

function OverviewMetric({ value, label }) {
  return (
    <span>
      <strong className="text-[var(--color-text-strong)]">{value}</strong>{' '}
      {label}
    </span>
  )
}

function OverviewDivider() {
  return (
    <span className="text-[var(--color-divider)]" aria-hidden="true">
      •
    </span>
  )
}

function LedgerColumnHeader() {
  return (
    <div className="hidden grid-cols-[minmax(15rem,1fr)_6rem_9rem_8rem_18rem] gap-2 border-b border-[var(--color-list-border)] bg-[var(--color-panel-soft-bg)] px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-text-subtle)] xl:grid">
      <span>Item</span>
      <span>Prazo</span>
      <span>Responsável</span>
      <span>Estado</span>
      <span>Execução</span>
    </div>
  )
}

function ListEmptyState({ searchTerm }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-dashed border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-4 py-10 text-center">
      <p className="text-sm font-bold text-[var(--color-text-strong)]">
        Nenhum item encontrado
      </p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
        {searchTerm
          ? 'Tente buscar por outro termo.'
          : 'Não há tarefas disponíveis nesta lista.'}
      </p>
    </div>
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
