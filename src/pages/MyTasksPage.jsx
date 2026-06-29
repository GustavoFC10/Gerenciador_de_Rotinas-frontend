import { useMemo } from 'react'

import RoutineListComparison from '../components/routine-control/list/RoutineListComparison.jsx'
import { useAppState } from '../contexts/AppStateContext.jsx'
import PageHeader from '../layouts/PageHeader.jsx'
import { buildRoutineListViewData, ROUTINE_LIST_MODE } from '../utils/routineListItems.js'

function MyTasksPage({
  data,
  selectedOptionId,
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onOptionChange,
}) {
  const { user } = useAppState()
  const listViewData = useMemo(
    () =>
      buildRoutineListViewData({
        data,
        filter: {
          type: ROUTINE_LIST_MODE.MY_TASKS,
          assigneeId: user.employeeId,
        },
      }),
    [data, user.employeeId],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Minhas tarefas"
        description="Fila pessoal de tarefas avulsas, sem obrigacao de vinculo com rotina ou empresa."
      />

      <div className="min-h-0 flex-1">
        <RoutineListComparison
          selectedOptionId={selectedOptionId}
          items={listViewData.items}
          onItemOpen={onItemOpen}
          onItemQuickAction={onItemQuickAction}
          onItemNoteChange={onItemNoteChange}
          onOptionChange={onOptionChange}
          showHeader={false}
        />
      </div>
    </div>
  )
}

export default MyTasksPage
