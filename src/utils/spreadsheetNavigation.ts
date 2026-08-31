import { ROUTES } from '../constants/routes'
import type { EntityId, ScreenSummary } from '../types/domain'
import type {
  ScreenNavigationItem,
  SpreadsheetNavigationItem,
} from '../types/navigation'

const SCREEN_ID_PARAM = 'screenId'

export interface SpreadsheetNavigationSelection {
  department: SpreadsheetNavigationItem | null
  screen: ScreenNavigationItem | null
  screenId: EntityId | null
  departmentId: EntityId | null
  isFallback: boolean
}

export interface SpreadsheetContext {
  screenId: EntityId | null
}

export function buildSpreadsheetNavigationItems(
  data: { screens: readonly ScreenSummary[] },
  basePath = ROUTES.SPREADSHEET,
): SpreadsheetNavigationItem[] {
  const screens = data.screens
    .filter((screen) => screen.type === 'spreadsheet' && !screen.archivedAt)
    .sort(
      (left, right) =>
        left.position - right.position ||
        left.name.localeCompare(right.name, 'pt-BR') ||
        left.id.localeCompare(right.id),
    )
    .map((screen) => ({
      id: screen.id,
      departmentId: screen.departmentId,
      name: screen.name,
      to: buildSpreadsheetPath(basePath, { screenId: screen.id }),
    })) satisfies ScreenNavigationItem[]

  const departments = new Map<EntityId, ScreenNavigationItem[]>()

  screens.forEach((screen) => {
    const current = departments.get(screen.departmentId) ?? []
    current.push(screen)
    departments.set(screen.departmentId, current)
  })

  return [...departments.entries()].map(([departmentId, departmentScreens]) => {
    const firstScreen = departmentScreens[0]!
    const departmentName = data.screens.find(
      (screen) => screen.departmentId === departmentId,
    )?.departmentName

    return {
      id: departmentId,
      departmentId,
      name: departmentName || 'Departamento',
      description:
        String(departmentScreens.length) +
        (departmentScreens.length === 1 ? ' tela' : ' telas'),
      to: firstScreen.to,
      screens: departmentScreens,
    }
  })
}

/**
 * Agendas não compartilham a projeção tabular das planilhas, mas continuam
 * sendo telas do departamento. Mantemos uma lista própria para que membros
 * possam descobri-las no menu sem inventar uma relação legada de "divisão".
 */
export function buildAgendaNavigationItems(data: {
  screens: readonly ScreenSummary[]
}): ScreenNavigationItem[] {
  return data.screens
    .filter((screen) => screen.type === 'agenda' && !screen.archivedAt)
    .sort(
      (left, right) =>
        left.position - right.position ||
        left.name.localeCompare(right.name, 'pt-BR') ||
        left.id.localeCompare(right.id),
    )
    .map((screen) => ({
      id: screen.id,
      departmentId: screen.departmentId,
      name: screen.name,
      description: screen.departmentName,
      to: `${ROUTES.AGENDA}?${new URLSearchParams({ screenId: screen.id }).toString()}`,
    }))
}

export function resolveSpreadsheetSelection(
  spreadsheets: SpreadsheetNavigationItem[],
  search: string | URLSearchParams,
): SpreadsheetNavigationSelection {
  const requestedScreenId = toSearchParams(search).get(SCREEN_ID_PARAM)
  const availableScreens = spreadsheets.flatMap((item) => item.screens)
  const screen = requestedScreenId
    ? (availableScreens.find((item) => item.id === requestedScreenId) ??
      availableScreens[0] ??
      null)
    : (availableScreens[0] ?? null)
  const department = screen
    ? (spreadsheets.find((item) => item.departmentId === screen.departmentId) ??
      null)
    : null

  return {
    department,
    screen,
    screenId: screen?.id ?? null,
    departmentId: screen?.departmentId ?? null,
    isFallback: requestedScreenId !== (screen?.id ?? null),
  }
}

export function buildSpreadsheetContextQuery(
  context: SpreadsheetContext,
  currentSearch: string | URLSearchParams = '',
): string {
  const searchParams = toSearchParams(currentSearch)

  if (context.screenId) {
    searchParams.set(SCREEN_ID_PARAM, context.screenId)
  } else {
    searchParams.delete(SCREEN_ID_PARAM)
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export function isSpreadsheetContextRoute(
  pathname: string,
  search = '',
): boolean {
  if (new URLSearchParams(search).get('source') === 'catalog') return false

  if (
    pathname === ROUTES.COMPANY_CREATE ||
    pathname === ROUTES.ROUTINE_CREATE ||
    pathname === ROUTES.EMPLOYEE_CREATE
  ) {
    return false
  }

  return (
    pathname === ROUTES.SPREADSHEET ||
    pathname === ROUTES.LIST ||
    pathname === ROUTES.TASKS ||
    pathname.startsWith(`${ROUTES.COMPANIES}/`) ||
    pathname.startsWith(`${ROUTES.ROUTINES}/`)
  )
}

function buildSpreadsheetPath(
  basePath: string,
  context: SpreadsheetContext,
): string {
  return `${basePath}${buildSpreadsheetContextQuery(context)}`
}

function toSearchParams(search: string | URLSearchParams): URLSearchParams {
  if (search instanceof URLSearchParams) return new URLSearchParams(search)

  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
}
