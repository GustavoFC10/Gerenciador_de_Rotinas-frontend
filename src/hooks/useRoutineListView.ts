import { useMemo, useState } from 'react'

import {
  buildRoutineListViewData,
  ROUTINE_LIST_MODE,
} from '../utils/routineListItems'
import type {
  Client,
  EntityId,
  Routine,
  RoutineControlData,
  RoutineListFilter,
} from '../types/domain'

export function useRoutineListView(data: RoutineControlData | null) {
  const [listFilter, setListFilter] = useState<RoutineListFilter>({
    type: ROUTINE_LIST_MODE.ROUTINE,
    id: 'routine-enviar-das',
  })

  const listViewData = useMemo(() => {
    if (!data) {
      return { title: 'Lista', description: '', items: [] }
    }

    return buildRoutineListViewData({ data, filter: listFilter })
  }, [data, listFilter])

  return {
    listFilter,
    listViewData,
    openRoutineList: (routine: Routine) =>
      setListFilter({ type: ROUTINE_LIST_MODE.ROUTINE, id: routine.id }),
    openClientList: (client: Client) =>
      setListFilter({ type: ROUTINE_LIST_MODE.CLIENT, id: client.id }),
    openGlobalList: () => setListFilter({ type: ROUTINE_LIST_MODE.GLOBAL }),
    openMyTasks: (assigneeId: EntityId) =>
      setListFilter({ type: ROUTINE_LIST_MODE.MY_TASKS, assigneeId }),
  }
}
