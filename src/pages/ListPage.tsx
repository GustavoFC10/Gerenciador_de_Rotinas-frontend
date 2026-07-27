import { useMemo } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'

import RoutineListComparison from '../components/routine-control/list/RoutineListComparison'
import { ROUTES } from '../constants/routes'
import PageHeader from '../layouts/PageHeader'
import type {
  RoutineListInteractionProps,
  RoutineListMode,
} from '../types/domain'
import {
  ROUTINE_LIST_MODE,
  buildRoutineListViewData,
} from '../utils/routineListItems'

function ListPage({
  data,
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onItemStatusChange,
}: RoutineListInteractionProps) {
  const [searchParams] = useSearchParams()
  const requestedType = searchParams.get('type')
  const type: RoutineListMode =
    requestedType === ROUTINE_LIST_MODE.CLIENT ||
    requestedType === ROUTINE_LIST_MODE.ROUTINE
      ? requestedType
      : ROUTINE_LIST_MODE.GLOBAL
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
    return <Navigate to={ROUTES.TASKS} replace />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={listViewData.title}
        description={listViewData.description}
      />

      <div className="min-h-0 flex-1">
        <RoutineListComparison
          title={listViewData.title}
          description={listViewData.description}
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

export default ListPage
