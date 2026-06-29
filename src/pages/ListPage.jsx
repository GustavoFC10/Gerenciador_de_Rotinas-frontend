import { useMemo } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'

import RoutineListComparison from '../components/routine-control/list/RoutineListComparison.jsx'
import { ROUTES } from '../constants/routes.js'
import PageHeader from '../layouts/PageHeader.jsx'
import { ROUTINE_LIST_MODE, buildRoutineListViewData } from '../utils/routineListItems.js'

function ListPage({
  data,
  selectedOptionId,
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onOptionChange,
}) {
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type') ?? ROUTINE_LIST_MODE.GLOBAL
  const id = searchParams.get('id')
  const isContextualList =
    (type === ROUTINE_LIST_MODE.CLIENT || type === ROUTINE_LIST_MODE.ROUTINE) &&
    id

  const listViewData = useMemo(
    () =>
      buildRoutineListViewData({
        data,
        filter: { type, id },
      }),
    [data, id, type],
  )

  if (!isContextualList) {
    return <Navigate to={ROUTES.SEARCH} replace />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={listViewData.title}
        description={listViewData.description}
      />

      <div className="min-h-0 flex-1">
        <RoutineListComparison
          selectedOptionId={selectedOptionId}
          title={listViewData.title}
          description={listViewData.description}
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

export default ListPage
