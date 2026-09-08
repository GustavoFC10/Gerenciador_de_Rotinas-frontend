import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'

import type {
  Department,
  RoutineControlData,
  Screen,
  ScreenSummary,
  SpreadsheetProjection,
} from '../types/domain'
import type {
  ScreenNavigationItem,
  SpreadsheetNavigationItem,
} from '../types/navigation'
import { selectScreenData } from '../utils/routineControlScope'
import {
  buildAgendaNavigationItems,
  buildSpreadsheetContextQuery,
  buildSpreadsheetNavigationItems,
  isSpreadsheetContextRoute,
  resolveSpreadsheetSelection,
  type SpreadsheetNavigationSelection,
} from '../utils/spreadsheetNavigation'

const EMPTY_NAVIGATION_SCREENS: readonly ScreenSummary[] = []

interface UseSpreadsheetContextOptions {
  data: RoutineControlData | null
  navigationScreens: readonly ScreenSummary[] | undefined
}

export interface SpreadsheetContext {
  spreadsheetNavigationItems: SpreadsheetNavigationItem[]
  agendaNavigationItems: ScreenNavigationItem[]
  spreadsheetSelection: SpreadsheetNavigationSelection
  selectedDepartmentGroup: SpreadsheetNavigationItem | null
  selectedDepartment: Department | null
  selectedScreen: Screen | null
  selectedProjection: SpreadsheetProjection | null
  visibleData: RoutineControlData | null
  spreadsheetContextQuery: string
  hasSpreadsheetContext: boolean
}

export function useSpreadsheetContext({
  data,
  navigationScreens,
}: UseSpreadsheetContextOptions): SpreadsheetContext {
  const location = useLocation()
  const navigate = useNavigate()
  const navigationData =
    navigationScreens ?? data?.screens ?? EMPTY_NAVIGATION_SCREENS
  const spreadsheetNavigationItems = useMemo(
    () => buildSpreadsheetNavigationItems({ screens: navigationData }),
    [navigationData],
  )
  const agendaNavigationItems = useMemo(
    () => buildAgendaNavigationItems({ screens: navigationData }),
    [navigationData],
  )
  const spreadsheetSelection = useMemo(
    () =>
      resolveSpreadsheetSelection(spreadsheetNavigationItems, location.search),
    [location.search, spreadsheetNavigationItems],
  )
  const selectedDepartmentGroup = spreadsheetSelection.department
  const selectedScreen =
    data?.screens.find(
      (screen) => screen.id === spreadsheetSelection.screenId,
    ) ?? null
  const selectedProjection =
    data?.spreadsheetProjections.find(
      (projection) => projection.screen.id === spreadsheetSelection.screenId,
    ) ?? null
  const selectedDepartment =
    data?.departments.find(
      (department) => department.id === spreadsheetSelection.departmentId,
    ) ?? null
  const visibleData = useMemo<RoutineControlData | null>(() => {
    if (!data || !spreadsheetSelection.screenId) return null

    return selectScreenData(data, spreadsheetSelection.screenId)
  }, [data, spreadsheetSelection.screenId])
  const spreadsheetContextQuery = buildSpreadsheetContextQuery({
    screenId: spreadsheetSelection.screenId,
  })
  const hasSpreadsheetContext = Boolean(
    selectedDepartmentGroup &&
    selectedScreen &&
    selectedProjection &&
    selectedDepartment &&
    visibleData,
  )

  useEffect(() => {
    if (
      !spreadsheetSelection.isFallback ||
      !spreadsheetSelection.screenId ||
      !isSpreadsheetContextRoute(location.pathname, location.search)
    ) {
      return
    }

    const nextSearch = buildSpreadsheetContextQuery(
      { screenId: spreadsheetSelection.screenId },
      location.search,
    )

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch,
        hash: location.hash,
      },
      { replace: true, state: location.state },
    )
  }, [
    location.hash,
    location.pathname,
    location.search,
    location.state,
    navigate,
    spreadsheetSelection.isFallback,
    spreadsheetSelection.screenId,
  ])

  return {
    spreadsheetNavigationItems,
    agendaNavigationItems,
    spreadsheetSelection,
    selectedDepartmentGroup,
    selectedDepartment,
    selectedScreen,
    selectedProjection,
    visibleData,
    spreadsheetContextQuery,
    hasSpreadsheetContext,
  }
}
