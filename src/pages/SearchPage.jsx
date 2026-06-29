import { useMemo, useState } from 'react'

import RoutineListComparison from '../components/routine-control/list/RoutineListComparison.jsx'
import PageHeader from '../layouts/PageHeader.jsx'
import { normalizeRoutineData } from '../utils/normalizeRoutineData.js'
import { searchTasks } from '../utils/routineFilters.js'
import { buildRoutineListViewData, ROUTINE_LIST_MODE } from '../utils/routineListItems.js'

function SearchPage({
  data,
  selectedOptionId,
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onOptionChange,
}) {
  const [term, setTerm] = useState('')
  const filteredData = useMemo(() => {
    const relations = normalizeRoutineData(data)

    return {
      ...data,
      tasks: searchTasks(data.tasks, term, relations),
    }
  }, [data, term])
  const listViewData = useMemo(
    () =>
      buildRoutineListViewData({
        data: filteredData,
        filter: { type: ROUTINE_LIST_MODE.SEARCH },
      }),
    [filteredData],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Busca global"
        description="Pesquise por empresa, rotina, responsavel, tarefa avulsa, status ou observacao."
      />

      <div className="mb-5 rounded-[var(--radius-panel)] border border-[var(--color-panel-border)] bg-[var(--color-panel-bg)] p-4 shadow-[var(--shadow-panel)]">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-[var(--color-text-muted)]">
            Busca
          </span>
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Empresa, rotina, responsavel, tarefa ou observacao"
            className="min-h-14 w-full rounded-[var(--radius-control)] border border-[var(--color-control-border)] bg-[var(--color-control-bg)] px-5 text-lg font-semibold text-[var(--color-control-text)] outline-none transition placeholder:text-[var(--color-control-placeholder)] focus:border-[var(--color-control-focus)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
          />
        </label>
      </div>

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

export default SearchPage
