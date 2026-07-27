import { useMemo } from 'react'
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router'

import RoutineListComparison from '../components/routine-control/list/RoutineListComparison'
import { ROUTES } from '../constants/routes'
import WorkspaceBar from '../layouts/WorkspaceBar'
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
  spreadsheetName = 'Fiscal',
  onItemOpen,
  onItemQuickAction,
  onItemNoteChange,
  onItemStatusChange,
}: RoutineListInteractionProps & { spreadsheetName?: string }) {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const spreadsheetId = searchParams.get('sheetId') ?? 'fiscal'
  const wasOpenedFromSpreadsheet = Boolean(
    (location.state as { fromSpreadsheet?: boolean } | null)?.fromSpreadsheet,
  )
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
    return (
      <Navigate
        to={`${ROUTES.TASKS}?sheetId=${encodeURIComponent(spreadsheetId)}`}
        replace
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceBar
        context={{
          label: `Planilha ${spreadsheetName}`,
          to: `${ROUTES.SPREADSHEET}?sheetId=${encodeURIComponent(spreadsheetId)}`,
          onBack: wasOpenedFromSpreadsheet ? () => navigate(-1) : undefined,
        }}
        label={type === ROUTINE_LIST_MODE.CLIENT ? 'Empresa' : 'Rotina'}
        title={listViewData.title}
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

export default ListPage
