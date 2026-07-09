import { useMemo, useState } from 'react'

import RoutineListCardOptionOne from './RoutineListCardOptionOne.jsx'
import RoutineListCardOptionThree from './RoutineListCardOptionThree.jsx'
import RoutineListCardOptionTwo from './RoutineListCardOptionTwo.jsx'
import RoutineListSection from './RoutineListSection.jsx'
import { groupRoutineListItemsByStatus } from './routineListUtils.js'

const listComparisonOptions = [
  {
    id: 'compact',
    name: 'Opcao 1',
    title: 'Fila compacta',
    description: 'Pagina densa para varrer muitas empresas rapidamente.',
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
  },
  {
    id: 'cards',
    name: 'Opcao 2',
    title: 'Painel de acompanhamento',
    description: 'Pagina mais visual, com resumo em destaque e secoes amplas.',
    Card: RoutineListCardOptionTwo,
    sectionVariant: 'cards',
    shellClass: 'bg-[var(--color-list-bg)]',
    shellNoHeaderClass: 'bg-transparent',
    headerClass:
      'rounded-t-2xl border border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] px-5 py-5 shadow-[var(--shadow-panel)] sm:px-6',
    eyebrowClass: 'text-[var(--color-accent)]',
    contentClass:
      'space-y-5 rounded-b-2xl border-x border-b border-[var(--color-list-border)] bg-[var(--color-list-bg)] p-4 sm:p-6',
    noHeaderContentClass:
      'space-y-5 rounded-2xl border border-[var(--color-list-border)] bg-[var(--color-list-bg)] p-4 sm:p-6',
  },
  {
    id: 'ledger',
    name: 'Opcao 3',
    title: 'Registro operacional',
    description: 'Pagina com leitura de controle, mais parecida com protocolo.',
    Card: RoutineListCardOptionThree,
    sectionVariant: 'ledger',
    shellClass: 'bg-[var(--color-list-panel-bg)]',
    shellNoHeaderClass: 'bg-transparent',
    headerClass:
      'border border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] px-5 py-5 text-[var(--color-text-strong)] sm:px-6',
    eyebrowClass: 'text-[var(--color-text-muted)]',
    contentClass:
      'space-y-0 border-x border-b border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] p-0',
    noHeaderContentClass:
      'space-y-0 border border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] p-0',
  },
]

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
    item.period,
    item.notes,
  ].some((value) => normalizeSearchValue(value).includes(normalizedTerm))
}

function RoutineListComparison({
  selectedOptionId,
  title,
  description,
  items,
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onItemStatusChange,
  onOptionChange,
  showHeader = true,
}) {
  const [pendingStatusById, setPendingStatusById] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const groupedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      pendingStatus: pendingStatusById[item.id],
      displayStatus: pendingStatusById[item.id] ?? item.status,
    }))
  }, [items, pendingStatusById])
  const visibleItems = useMemo(
    () => groupedItems.filter((item) => itemMatchesSearch(item, searchTerm)),
    [groupedItems, searchTerm],
  )
  const groups = useMemo(
    () => groupRoutineListItemsByStatus(visibleItems),
    [visibleItems],
  )

  const selectedOption =
    listComparisonOptions.find((option) => option.id === selectedOptionId) ??
    listComparisonOptions[0]
  const SelectedCard = selectedOption.Card
  const contentClass = showHeader
    ? selectedOption.contentClass
    : (selectedOption.noHeaderContentClass ?? selectedOption.contentClass)
  const shellClass = showHeader
    ? selectedOption.shellClass
    : (selectedOption.shellNoHeaderClass ?? selectedOption.shellClass)

  function handlePendingStatusChange(item, status) {
    setPendingStatusById((current) => {
      const next = { ...current }

      if (status === item.status) {
        delete next[item.id]
      } else {
        next[item.id] = status
      }

      return next
    })
  }

  function handlePendingStatusCancel(item) {
    setPendingStatusById((current) => {
      const next = { ...current }
      delete next[item.id]
      return next
    })
  }

  function handlePendingStatusConfirm(item) {
    if (!item.pendingStatus) return

    onItemStatusChange?.(item, item.pendingStatus)
    handlePendingStatusCancel(item)
  }

  return (
    <section
      className={`overflow-hidden ${showHeader ? 'rounded-2xl' : ''} ${shellClass}`}
    >
      {showHeader && (
        <header className={selectedOption.headerClass}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-[0.18em] ${selectedOption.eyebrowClass}`}
              >
                Lista operacional
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                {title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">
                {description ??
                  `${selectedOption.title}: ${selectedOption.description}`}
              </p>
            </div>

            <ListDisplaySelect
              selectedOption={selectedOption}
              onOptionChange={onOptionChange}
            />
          </div>
        </header>
      )}

      {!showHeader && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <ListSearchInput value={searchTerm} onChange={setSearchTerm} />
          <ListDisplaySelect
            selectedOption={selectedOption}
            onOptionChange={onOptionChange}
          />
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
            variant={selectedOption.sectionVariant}
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

function ListDisplaySelect({ selectedOption, onOptionChange }) {
  return (
    <label className="text-sm font-medium text-[var(--color-text-muted)]">
      Display da lista
      <select
        value={selectedOption.id}
        onChange={(event) => onOptionChange?.(event.target.value)}
        className="ml-3 rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-3 py-2 text-sm text-[var(--color-control-text)] outline-none focus:border-[var(--color-control-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]"
      >
        {listComparisonOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  )
}

export default RoutineListComparison
