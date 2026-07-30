import { Navigate, useSearchParams } from 'react-router'

import { ROUTES } from '../constants/routes'
import { ROUTINE_LIST_MODE } from '../utils/routineListItems'

function ListPage() {
  const [searchParams] = useSearchParams()
  const spreadsheetId = searchParams.get('sheetId') ?? 'fiscal'
  const divisionId = searchParams.get('divisionId')
  const requestedType = searchParams.get('type')
  const id = searchParams.get('id')
  const spreadsheetContext = new URLSearchParams({
    sheetId: spreadsheetId,
  })

  if (divisionId) {
    spreadsheetContext.set('divisionId', divisionId)
  }

  if (id && requestedType === ROUTINE_LIST_MODE.CLIENT) {
    return (
      <Navigate
        to={`${ROUTES.COMPANIES}/${encodeURIComponent(id)}?${spreadsheetContext.toString()}`}
        replace
      />
    )
  }

  if (id && requestedType === ROUTINE_LIST_MODE.ROUTINE) {
    return (
      <Navigate
        to={`${ROUTES.ROUTINES}/${encodeURIComponent(id)}?${spreadsheetContext.toString()}`}
        replace
      />
    )
  }

  return (
    <Navigate to={`${ROUTES.TASKS}?${spreadsheetContext.toString()}`} replace />
  )
}

export default ListPage
