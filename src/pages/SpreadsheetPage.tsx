import RoutineControlTable from '../components/routine-control/spreadsheet/RoutineControlTable'
import SpreadsheetScreenNavigation from '../components/routine-control/spreadsheet/SpreadsheetScreenNavigation'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type {
  Client,
  EntityId,
  Routine,
  RoutineStatus,
  Screen,
  SpreadsheetProjection,
  Task,
} from '../types/domain'
import type { ScreenNavigationItem } from '../types/navigation'

interface SpreadsheetPageProps {
  departmentName?: string
  screens: ScreenNavigationItem[]
  selectedScreenId: EntityId | null
  screen: Screen
  projection: SpreadsheetProjection
  visibleData: {
    clients: Client[]
    routines: Routine[]
    tasks: Task[]
  }
  onClientOpen?: (client: Client) => void
  onRoutineOpen?: (routine: Routine) => void
  onTaskOpen?: (task: Task) => void
  onTaskStatusChange?: (taskId: EntityId, status: RoutineStatus) => void
  getAllowedTaskStatusChanges?: (task: Task) => readonly RoutineStatus[]
  onTaskAttachmentAdd?: (task: Task) => void
}

function SpreadsheetPage({
  departmentName,
  screens,
  selectedScreenId,
  screen,
  projection,
  visibleData,
  onClientOpen,
  onRoutineOpen,
  onTaskOpen,
  onTaskStatusChange,
  getAllowedTaskStatusChanges,
  onTaskAttachmentAdd,
}: SpreadsheetPageProps) {
  const title = departmentName ?? screen.departmentName

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceBar
        label="Departamento"
        title={title}
        meta={screen.name + ' · ' + screen.companies.length + ' empresas · ' + screen.routines.length + ' rotinas'}
      />

      <SpreadsheetScreenNavigation
        items={screens}
        activeScreenId={selectedScreenId}
        selectLabel={'Tela de ' + title.toLocaleLowerCase('pt-BR')}
        ariaLabel={'Telas do departamento ' + title}
        className="mb-3"
      />

      <div className="min-h-0 flex-1">
        <RoutineControlTable
          accessibleName={'Planilha ' + title + ' — ' + screen.name}
          showHeader={false}
          clients={visibleData.clients}
          routines={visibleData.routines}
          screen={screen}
          projection={projection}
          tasks={visibleData.tasks}
          onClientOpen={onClientOpen}
          onRoutineOpen={onRoutineOpen}
          onTaskOpen={onTaskOpen}
          onTaskStatusChange={onTaskStatusChange}
          getAllowedTaskStatusChanges={getAllowedTaskStatusChanges}
          onTaskAttachmentAdd={onTaskAttachmentAdd}
        />
      </div>
    </div>
  )
}

export default SpreadsheetPage
