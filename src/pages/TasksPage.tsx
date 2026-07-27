import { useMemo } from 'react'

import RoutineListComparison from '../components/routine-control/list/RoutineListComparison'
import PageHeader from '../layouts/PageHeader'
import type { RoutineListInteractionProps } from '../types/domain'
import {
  buildRoutineListViewData,
  ROUTINE_LIST_MODE,
} from '../utils/routineListItems'

function TasksPage({
  data,
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onItemStatusChange,
}: RoutineListInteractionProps) {
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
      <PageHeader
        title="Tarefas - Fiscal"
        description="Todas as tarefas fiscais acessiveis em formato de lista operacional."
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
