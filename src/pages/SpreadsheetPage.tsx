import RoutineControlTable from '../components/routine-control/spreadsheet/RoutineControlTable'
import SpreadsheetDivisionNavigation from '../components/routine-control/spreadsheet/SpreadsheetDivisionNavigation'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type {
  Client,
  ClientRoutineLink,
  Department,
  DepartmentDivision,
  EntityId,
  Routine,
  RoutineStatus,
  Task,
} from '../types/domain'
import type { SpreadsheetDivisionNavigationItem } from '../types/navigation'

interface SpreadsheetPageProps {
  spreadsheetName?: string
  divisionName?: string
  divisions?: SpreadsheetDivisionNavigationItem[]
  selectedDivisionId?: EntityId | null
  visibleData: {
    departments?: Department[]
    divisions?: DepartmentDivision[]
    clients: Client[]
    routines: Routine[]
    clientRoutineLinks: ClientRoutineLink[]
    tasks: Task[]
  }
  onClientOpen?: (client: Client) => void
  onRoutineOpen?: (routine: Routine) => void
  onTaskOpen?: (task: Task) => void
  onTaskStatusChange?: (taskId: EntityId, status: RoutineStatus) => void
  onTaskAttachmentAdd?: (task: Task) => void
}

function SpreadsheetPage({
  spreadsheetName = 'Fiscal',
  divisionName,
  divisions = [],
  selectedDivisionId = null,
  visibleData,
  onClientOpen,
  onRoutineOpen,
  onTaskOpen,
  onTaskStatusChange,
  onTaskAttachmentAdd,
}: SpreadsheetPageProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceBar
        label="Departamento"
        title={spreadsheetName}
        meta={`${divisionName ? `${divisionName} · ` : ''}${
          visibleData.clients.length
        } empresas · ${visibleData.routines.length} rotinas`}
      />

      <SpreadsheetDivisionNavigation
        items={divisions}
        activeDivisionId={selectedDivisionId}
        selectLabel={`Divisão ${spreadsheetName.toLocaleLowerCase('pt-BR')}`}
        ariaLabel={`Planilhas do departamento ${spreadsheetName}`}
        className="mb-3"
      />

      <div className="min-h-0 flex-1">
        <RoutineControlTable
          accessibleName={`Planilha ${spreadsheetName}${
            divisionName ? ` — ${divisionName}` : ''
          }`}
          showHeader={false}
          departments={visibleData.departments}
          divisions={visibleData.divisions}
          clients={visibleData.clients}
          routines={visibleData.routines}
          clientRoutineLinks={visibleData.clientRoutineLinks}
          tasks={visibleData.tasks}
          onClientOpen={onClientOpen}
          onRoutineOpen={onRoutineOpen}
          onTaskOpen={onTaskOpen}
          onTaskStatusChange={onTaskStatusChange}
          onTaskAttachmentAdd={onTaskAttachmentAdd}
        />
      </div>
    </div>
  )
}

export default SpreadsheetPage
