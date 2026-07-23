import { useMemo } from 'react'

import RoutineListComparison from '../components/routine-control/list/RoutineListComparison.jsx'
import RoutineListViewSwitcher from '../components/routine-control/list/RoutineListViewSwitcher.jsx'
import PageHeader from '../layouts/PageHeader.jsx'
import {
  buildRoutineListViewData,
  ROUTINE_LIST_MODE,
} from '../utils/routineListItems.js'

function TasksPage({
  data,
  viewMode,
  onViewModeChange,
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onItemStatusChange,
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
      <PageHeader
        title="Tarefas - Fiscal"
        description="Todas as tarefas fiscais acessiveis em formato de lista operacional."
        actions={
          <RoutineListViewSwitcher
            value={viewMode}
            onChange={onViewModeChange}
          />
        }
      />

      <div className="min-h-0 flex-1">
        <RoutineListComparison
          items={listViewData.items}
          viewMode={viewMode}
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
