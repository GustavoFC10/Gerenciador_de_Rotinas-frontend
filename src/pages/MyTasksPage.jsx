import { useMemo, useState } from 'react'

import LooseTaskFormModal from '../components/routine-control/forms/LooseTaskFormModal.jsx'
import RoutineListComparison from '../components/routine-control/list/RoutineListComparison.jsx'
import { useAppState } from '../contexts/AppStateContext.jsx'
import PageHeader from '../layouts/PageHeader.jsx'
import {
  buildRoutineListViewData,
  ROUTINE_LIST_MODE,
} from '../utils/routineListItems.js'

function MyTasksPage({
  data,
  selectedOptionId,
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onItemStatusChange,
  onOptionChange,
  onLooseTaskCreate,
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
      <PageHeader
        title="Minhas tarefas"
        description="Fila pessoal de tarefas avulsas, sem obrigacao de vinculo com rotina ou empresa."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-[var(--radius-control)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] px-3 py-2 text-sm font-bold text-[var(--color-text-muted)] shadow-[var(--shadow-panel)]">
              {listViewData.items.length} tarefas
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="grid size-10 place-items-center rounded-[var(--radius-control)] bg-[var(--color-button-primary-bg)] text-xl font-black leading-none text-[var(--color-button-primary-text)] shadow-[var(--shadow-panel)] transition hover:bg-[var(--color-button-primary-hover-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-control-focus)]"
              aria-label="Adicionar tarefa avulsa"
              title="Adicionar tarefa avulsa"
            >
              +
            </button>
          </div>
        }
      />

      <div className="min-h-0 flex-1">
        <RoutineListComparison
          selectedOptionId={selectedOptionId}
          items={listViewData.items}
          onItemOpen={onItemOpen}
          onItemQuickAction={onItemQuickAction}
          onItemNoteChange={onItemNoteChange}
          onItemStatusChange={onItemStatusChange}
          onOptionChange={onOptionChange}
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

export default MyTasksPage
