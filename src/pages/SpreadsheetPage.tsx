import RoutineControlTable from '../components/routine-control/spreadsheet/RoutineControlTable'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type { Client, Routine, Task } from '../types/domain'

interface SpreadsheetPageProps {
  spreadsheetName?: string
  visibleData: {
    clients: Client[]
    routines: Routine[]
    tasks: Task[]
  }
  onClientOpen?: (client: Client) => void
  onRoutineOpen?: (routine: Routine) => void
  onTaskOpen?: (task: Task) => void
}

function SpreadsheetPage({
  spreadsheetName = 'Fiscal',
  visibleData,
  onClientOpen,
  onRoutineOpen,
  onTaskOpen,
}: SpreadsheetPageProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceBar
        label="Planilha"
        title={spreadsheetName}
        meta={`${visibleData.clients.length} empresas · ${visibleData.routines.length} rotinas`}
      />

      <div className="min-h-0 flex-1">
        <RoutineControlTable
          accessibleName={`Planilha ${spreadsheetName}`}
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
