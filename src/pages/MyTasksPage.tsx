import { useMemo, useState } from 'react'

import LooseTaskFormModal from '../components/routine-control/forms/LooseTaskFormModal'
import RoutineListComparison from '../components/routine-control/list/RoutineListComparison'
import { focusRing } from '../constants/designTokens'
import { useAppState } from '../hooks/useAppState'
import WorkspaceBar from '../layouts/WorkspaceBar'
import type { RoutineListInteractionProps, Task } from '../types/domain'
import {
  buildRoutineListViewData,
  ROUTINE_LIST_MODE,
} from '../utils/routineListItems'

function MyTasksPage({
  data,
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onItemStatusChange,
  onLooseTaskCreate,
}: RoutineListInteractionProps & {
  onLooseTaskCreate?: (task: Task) => void
}) {
  const { user } = useAppState()
  const [isFormOpen, setIsFormOpen] = useState(false)
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
      <WorkspaceBar
        title="Minhas tarefas avulsas"
        actions={
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] px-3.5 text-sm font-bold text-[var(--color-button-primary-text)] shadow-[var(--shadow-panel)] transition hover:bg-[var(--color-button-primary-hover-bg)] ${focusRing}`}
          >
            <PlusIcon />
            Nova tarefa
          </button>
        }
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

      {isFormOpen && (
        <LooseTaskFormModal
          data={data}
          onClose={() => setIsFormOpen(false)}
          onCreate={onLooseTaskCreate}
        />
      )}
    </div>
  )
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export default MyTasksPage
