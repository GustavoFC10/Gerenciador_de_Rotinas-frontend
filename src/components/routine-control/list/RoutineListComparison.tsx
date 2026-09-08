import { useEffect, useMemo, useState } from 'react'

import TaskContextMenu from '../../context-menu/TaskContextMenu'
import { ROUTINE_STATUS } from '../../../constants/routineStatus'
import RoutineListCardOptionThree from './RoutineListCardOptionThree'
import RoutineListSection from './RoutineListSection'
import { groupRoutineListItemsByStatus } from './routineListUtils'
import type { RoutineListItem, RoutineStatus } from '../../../types/domain'

type RoutineListQuickAction = 'attach'

function normalizeSearchValue(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function itemMatchesSearch(item: RoutineListItem, term: string): boolean {
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
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onItemStatusChange,
  getAllowedStatusChanges,
  showHeader = false,
}: {
  title?: string
  description?: string
  items: RoutineListItem[]
  onItemOpen?: (item: RoutineListItem) => void
  onItemQuickAction?: (
    item: RoutineListItem,
    action: RoutineListQuickAction,
  ) => void
  onItemNoteChange?: (item: RoutineListItem, notes: string) => void
  onItemStatusChange?: (item: RoutineListItem, status: RoutineStatus) => void
  getAllowedStatusChanges?: (item: RoutineListItem) => readonly RoutineStatus[]
  showHeader?: boolean
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [contextMenu, setContextMenu] = useState<{
    item: RoutineListItem
    x: number
    y: number
    trigger: HTMLButtonElement
  } | null>(null)
  const visibleItems = useMemo(
    () => items.filter((item) => itemMatchesSearch(item, searchTerm)),
    [items, searchTerm],
  )
  const groups = useMemo(
    () => groupRoutineListItemsByStatus(visibleItems),
    [visibleItems],
  )
  const hasTaskContextMenu = Boolean(
    (onItemStatusChange &&
      items.some((item) => {
        const statuses = getAllowedStatusChanges?.(item)
        return statuses ? statuses.length > 0 : true
      })) ||
    onItemQuickAction ||
    items.some((item) => (item.task.links?.length ?? 0) > 0),
  )

  const contentClass = showHeader
    ? 'overflow-hidden bg-[var(--color-list-panel-bg)] shadow-[var(--shadow-panel)]'
    : 'overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] shadow-[var(--shadow-panel)]'

  function handleStatusChange(item: RoutineListItem, status: RoutineStatus) {
    onItemStatusChange?.(item, status)
  }

  useEffect(() => {
    if (
      contextMenu &&
      !visibleItems.some((item) => item.id === contextMenu.item.id)
    ) {
      setContextMenu(null)
    }
  }, [contextMenu, visibleItems])

  function openTaskContextMenu(
    item: RoutineListItem,
    x: number,
    y: number,
    trigger: HTMLButtonElement,
  ) {
    setContextMenu({ item, x, y, trigger })
  }

  function closeTaskContextMenu(restoreFocus: boolean) {
    const trigger = contextMenu?.trigger
    setContextMenu(null)

    if (restoreFocus && trigger?.isConnected) {
      window.requestAnimationFrame(() => trigger.focus())
    }
  }

  function handleContextStatusChange(_taskId: string, status: RoutineStatus) {
    const item = contextMenu?.item
    if (!item) return

    onItemStatusChange?.(item, status)
  }

  function handleContextAttachmentAdd() {
    if (!contextMenu) return
    onItemQuickAction?.(contextMenu.item, 'attach')
  }

  return (
    <>
      <section
        className={`overflow-hidden ${showHeader ? 'rounded-2xl bg-[var(--color-list-panel-bg)]' : 'bg-transparent'}`}
        data-list-view="ledger"
      >
        {showHeader && (
          <header className="border-b border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
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

        <ListOverview items={visibleItems} />

        <div className={contentClass}>
          <LedgerColumnHeader />

          {groups.length > 0 ? (
            groups.map((group) => (
              <RoutineListSection
                key={group.key ?? group.status}
                group={group}
                variant="ledger"
              >
                {group.items.map((item) => {
                  const allowedStatuses = getAllowedStatusChanges?.(item)
                  const canChangeStatus = Boolean(
                    onItemStatusChange &&
                    (allowedStatuses ? allowedStatuses.length : true),
                  )

                  return (
                    <RoutineListCardOptionThree
                      key={item.id}
                      item={item}
                      onOpen={onItemOpen}
                      onQuickAction={onItemQuickAction}
                      onNoteChange={onItemNoteChange}
                      onStatusChange={
                        canChangeStatus ? handleStatusChange : undefined
                      }
                      allowedStatusChanges={allowedStatuses}
                      onContextMenuOpen={
                        hasTaskContextMenu ? openTaskContextMenu : undefined
                      }
                      isContextMenuOpen={contextMenu?.item.id === item.id}
                    />
                  )
                })}
              </RoutineListSection>
            ))
          ) : (
            <ListEmptyState searchTerm={searchTerm} />
          )}
        </div>
      </section>

      {contextMenu && (
        <TaskContextMenu
          key={`${contextMenu.item.id}:${contextMenu.x}:${contextMenu.y}`}
          task={{
            ...contextMenu.item.task,
          }}
          label={getContextMenuLabel(contextMenu.item)}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeTaskContextMenu}
          onStatusChange={
            onItemStatusChange &&
            (getAllowedStatusChanges
              ? getAllowedStatusChanges(contextMenu.item).length > 0
              : true)
              ? handleContextStatusChange
              : undefined
          }
          allowedStatusChanges={getAllowedStatusChanges?.(contextMenu.item)}
          onAttachmentAdd={
            onItemQuickAction ? handleContextAttachmentAdd : undefined
          }
        />
      )}
    </>
  )
}

function getContextMenuLabel(item: RoutineListItem): string {
  const routine = item.routineName?.trim()
  const company = item.companyName?.trim()

  if (routine && company) return `${routine} · ${company}`
  return item.primaryLabel || item.title || 'Tarefa'
}

function ListOverview({ items }: { items: RoutineListItem[] }) {
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

function OverviewMetric({ value, label }: { value: number; label: string }) {
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
    <div className="hidden grid-cols-[minmax(15rem,1fr)_6rem_9rem_18rem] gap-2 border-b border-[var(--color-list-border)] bg-[var(--color-panel-soft-bg)] px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--color-text-subtle)] xl:grid">
      <span>Item</span>
      <span>Prazo</span>
      <span>Responsável</span>
      <span>Execução</span>
    </div>
  )
}

function ListEmptyState({ searchTerm }: { searchTerm: string }) {
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

function ListSearchInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
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

export default RoutineListComparison
