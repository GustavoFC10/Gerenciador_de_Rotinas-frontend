import { useState } from 'react'

import RoutineControlTable from '../components/routine-control/spreadsheet/RoutineControlTable.jsx'
import ViewStyleSwitcher from '../components/ui/ViewStyleSwitcher.jsx'
import PageHeader from '../layouts/PageHeader.jsx'

const spreadsheetViewOptions = [
  {
    id: 'label',
    label: 'Opção 1',
  },
  {
    id: 'round',
    label: 'Opção 2',
  },
  {
    id: 'dense',
    label: 'Opção 3',
  },
]

function SpreadsheetViewMenu({ selectedOptionId, onOptionChange }) {
  return (
    <ViewStyleSwitcher
      value={selectedOptionId}
      options={spreadsheetViewOptions}
      onChange={onOptionChange}
      ariaLabel="Trocar visualização da planilha"
      title="Visualização da planilha"
    />
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
