import { useState } from 'react'

import RoutineControlTable from '../components/routine-control/spreadsheet/RoutineControlTable.jsx'
import PageHeader from '../layouts/PageHeader.jsx'

function LayoutGridIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M4 5.5h6v5H4zM14 5.5h6v5h-6zM4 14h6v4.5H4zM14 14h6v4.5h-6z"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const spreadsheetViewOptions = [
  { id: 'label', name: 'Opcao 1' },
  { id: 'round', name: 'Opcao 2' },
]

function SpreadsheetViewMenu({ selectedOptionId, onOptionChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption =
    spreadsheetViewOptions.find((option) => option.id === selectedOptionId) ??
    spreadsheetViewOptions[0]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="grid size-9 place-items-center rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] text-[var(--color-text-muted)] shadow-[var(--shadow-panel)] transition hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
        aria-label="Escolher visualizacao da planilha"
        title="Visualizacao da planilha"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <LayoutGridIcon />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-32 rounded-[var(--radius-control)] border border-[var(--color-list-border)] bg-[var(--color-list-panel-bg)] p-1 shadow-[var(--shadow-floating)]"
        >
          {spreadsheetViewOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitem"
              onClick={() => {
                onOptionChange?.(option.id)
                setIsOpen(false)
              }}
              className={`block w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-xs font-bold uppercase ${
                selectedOption.id === option.id
                  ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-control-hover-bg)] hover:text-[var(--color-text-strong)]'
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SpreadsheetPage({
  visibleData,
  onClientOpen,
  onRoutineOpen,
  onTaskOpen,
}) {
  const [selectedSpreadsheetOptionId, setSelectedSpreadsheetOptionId] =
    useState(spreadsheetViewOptions[0].id)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        size="workspace"
        title="Planilha operacional"
        description="Clientes nas linhas e rotinas nas colunas. Clique nos cabecalhos para abrir listas especificas sem sair do fluxo operacional."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SpreadsheetViewMenu
              selectedOptionId={selectedSpreadsheetOptionId}
              onOptionChange={setSelectedSpreadsheetOptionId}
            />
            <div className="rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-3 py-2 text-sm font-bold text-[var(--color-text-muted)] shadow-[var(--shadow-panel)]">
              {visibleData.clients.length} clientes -{' '}
              {visibleData.routines.length} rotinas
            </div>
          </div>
        }
      />

      <div className="min-h-0 flex-1">
        <RoutineControlTable
          title="Planilha operacional"
          description="Clique em uma rotina para listar empresas, ou em uma empresa para listar rotinas."
          showHeader={false}
          clients={visibleData.clients}
          routines={visibleData.routines}
          tasks={visibleData.tasks}
          variant={selectedSpreadsheetOptionId}
          onClientOpen={onClientOpen}
          onRoutineOpen={onRoutineOpen}
          onTaskOpen={onTaskOpen}
        />
      </div>
    </div>
  )
}

export default SpreadsheetPage
