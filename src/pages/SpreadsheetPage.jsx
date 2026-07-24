import RoutineControlTable from '../components/routine-control/spreadsheet/RoutineControlTable.jsx'
import PageHeader from '../layouts/PageHeader.jsx'

function SpreadsheetPage({
  visibleData,
  onClientOpen,
  onRoutineOpen,
  onTaskOpen,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        size="workspace"
        title="Planilha operacional"
        description="Clientes nas linhas e rotinas nas colunas. Clique nos cabecalhos para abrir listas especificas sem sair do fluxo operacional."
      />

      <div className="min-h-0 flex-1">
        <RoutineControlTable
          title="Planilha operacional"
          description="Clique em uma rotina para listar empresas, ou em uma empresa para listar rotinas."
          showHeader={false}
          clients={visibleData.clients}
          routines={visibleData.routines}
          tasks={visibleData.tasks}
          onClientOpen={onClientOpen}
          onRoutineOpen={onRoutineOpen}
          onTaskOpen={onTaskOpen}
        />
      </div>
    </div>
  )
}

export default SpreadsheetPage
