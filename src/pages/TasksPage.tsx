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
  spreadsheetId = 'fiscal',
  spreadsheetName = 'Fiscal',
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onItemStatusChange,
}: RoutineListInteractionProps & {
  spreadsheetId?: string
  spreadsheetName?: string
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
        context={{
          label: `Planilha ${spreadsheetName}`,
          to: `${ROUTES.SPREADSHEET}?sheetId=${encodeURIComponent(
            spreadsheetId,
          )}`,
        }}
        title="Todas as tarefas"
      />

      <div className="min-h-0 flex-1">
        <RoutineListComparison
          items={listViewData.items}
          onItemOpen={onItemOpen}
          onItemQuickAction={onItemQuickAction}
          onItemNoteChange={onItemNoteChange}
          onItemStatusChange={onItemStatusChange}
          showHeader={false}
        />
      </div>
    </div>
  )
}

export default TasksPage
