import { useMemo } from 'react'

import RoutineListComparison from '../components/routine-control/list/RoutineListComparison'
import { ROUTES } from '../constants/routes'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type { RoutineListInteractionProps } from '../types/domain'
import {
  buildRoutineListViewData,
  ROUTINE_LIST_MODE,
} from '../utils/routineListItems'

function TasksPage({
  data,
  screenId,
  screenName,
  onItemOpen,
  onItemStatusChange,
  getAllowedStatusChanges,
}: RoutineListInteractionProps & {
  screenId?: string
  screenName?: string
}) {
  const listViewData = useMemo(
    () =>
      buildRoutineListViewData({
        data,
        filter: { type: ROUTINE_LIST_MODE.GLOBAL },
      }),
    [data],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceBar
        context={
          screenId
            ? {
                label: `Tela ${screenName ?? ''}`,
                to: `${ROUTES.SPREADSHEET}?screenId=${encodeURIComponent(screenId)}`,
              }
            : undefined
        }
        title="Todas as tarefas"
      />
      <div className="min-h-0 flex-1">
        <RoutineListComparison
          items={listViewData.items}
          onItemOpen={onItemOpen}
          onItemStatusChange={onItemStatusChange}
          getAllowedStatusChanges={getAllowedStatusChanges}
          showHeader={false}
        />
      </div>
    </div>
  )
}

export default TasksPage
