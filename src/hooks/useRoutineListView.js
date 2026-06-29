import { useMemo, useState } from 'react'

import {
  buildRoutineListViewData,
  ROUTINE_LIST_MODE,
} from '../utils/routineListItems.js'

export function useRoutineListView(data) {
  const [listFilter, setListFilter] = useState({
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
    openRoutineList: (routine) =>
      setListFilter({ type: ROUTINE_LIST_MODE.ROUTINE, id: routine.id }),
    openClientList: (client) =>
      setListFilter({ type: ROUTINE_LIST_MODE.CLIENT, id: client.id }),
    openGlobalList: () => setListFilter({ type: ROUTINE_LIST_MODE.GLOBAL }),
    openMyTasks: (assigneeId) =>
      setListFilter({ type: ROUTINE_LIST_MODE.MY_TASKS, assigneeId }),
    openSearch: () => setListFilter({ type: ROUTINE_LIST_MODE.SEARCH }),
  }
}
