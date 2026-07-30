import { ROUTES } from '../constants/routes'
import type {
  Department,
  DepartmentDivision,
  EntityId,
  RoutineControlData,
} from '../types/domain'
import type {
  SpreadsheetDivisionNavigationItem,
  SpreadsheetNavigationItem,
} from '../types/navigation'

const SPREADSHEET_ID_PARAM = 'sheetId'
const DIVISION_ID_PARAM = 'divisionId'

type SpreadsheetNavigationSource = Pick<
  RoutineControlData,
  'departments' | 'divisions'
>

export interface SpreadsheetNavigationSelection {
  spreadsheet: SpreadsheetNavigationItem | null
  division: SpreadsheetDivisionNavigationItem | null
  spreadsheetId: EntityId | null
  departmentId: EntityId | null
  divisionId: EntityId | null
  isFallback: boolean
}

export interface SpreadsheetContext {
  spreadsheetId: EntityId | null
  divisionId?: EntityId | null
}

export function buildSpreadsheetNavigationItems(
  data: SpreadsheetNavigationSource,
  basePath = ROUTES.SPREADSHEET,
): SpreadsheetNavigationItem[] {
  const activeDivisions = (data.divisions ?? [])
    .filter((division) => division.active !== false)
    .sort(compareDivisions)

  return data.departments.map((department) => {
    const divisions = activeDivisions
      .filter((division) => division.departmentId === department.id)
      .map((division) =>
        buildDivisionNavigationItem(department, division, basePath),
      )
    const spreadsheetId = getSpreadsheetId(department.id)
    const defaultDivision = divisions[0] ?? null

    return {
      id: spreadsheetId,
      departmentId: department.id,
      name: department.name,
      description: getDivisionCountDescription(divisions.length),
      to: buildSpreadsheetPath(basePath, {
        spreadsheetId,
        divisionId: defaultDivision?.id ?? null,
      }),
      divisions,
    }
  })
}

export function resolveSpreadsheetSelection(
  spreadsheets: SpreadsheetNavigationItem[],
  search: string | URLSearchParams,
): SpreadsheetNavigationSelection {
  const searchParams = toSearchParams(search)
  const requestedSpreadsheetId = searchParams.get(SPREADSHEET_ID_PARAM)
  const requestedDivisionId = searchParams.get(DIVISION_ID_PARAM)
  const requestedSpreadsheet = requestedSpreadsheetId
    ? spreadsheets.find((item) => item.id === requestedSpreadsheetId)
    : undefined
  const spreadsheet = requestedSpreadsheet ?? spreadsheets[0] ?? null
  const divisions = spreadsheet?.divisions ?? []
  const requestedDivision =
    requestedDivisionId && requestedSpreadsheet
      ? divisions.find((division) => division.id === requestedDivisionId)
      : undefined
  const division = requestedDivision ?? divisions[0] ?? null
  const selectedSpreadsheetId = spreadsheet?.id ?? null
  const selectedDivisionId = division?.id ?? null

  return {
    spreadsheet,
    division,
    spreadsheetId: selectedSpreadsheetId,
    departmentId: spreadsheet?.departmentId ?? null,
    divisionId: selectedDivisionId,
    isFallback:
      requestedSpreadsheetId !== selectedSpreadsheetId ||
      requestedDivisionId !== selectedDivisionId,
  }
}

export function buildSpreadsheetContextQuery(
  context: SpreadsheetContext,
  currentSearch: string | URLSearchParams = '',
): string {
  const searchParams = toSearchParams(currentSearch)

  if (context.spreadsheetId) {
    searchParams.set(SPREADSHEET_ID_PARAM, context.spreadsheetId)
  } else {
    searchParams.delete(SPREADSHEET_ID_PARAM)
  }

  if (context.divisionId) {
    searchParams.set(DIVISION_ID_PARAM, context.divisionId)
  } else {
    searchParams.delete(DIVISION_ID_PARAM)
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

function buildDivisionNavigationItem(
  department: Department,
  division: DepartmentDivision,
  basePath: string,
): SpreadsheetDivisionNavigationItem {
  const spreadsheetId = getSpreadsheetId(department.id)

  return {
    id: division.id,
    departmentId: department.id,
    name: division.name,
    description: division.description,
    to: buildSpreadsheetPath(basePath, {
      spreadsheetId,
      divisionId: division.id,
    }),
  }
}

function buildSpreadsheetPath(
  basePath: string,
  context: SpreadsheetContext,
): string {
  return `${basePath}${buildSpreadsheetContextQuery(context)}`
}

function compareDivisions(
  left: DepartmentDivision,
  right: DepartmentDivision,
): number {
  return (
    left.position - right.position ||
    left.name.localeCompare(right.name, 'pt-BR') ||
    left.id.localeCompare(right.id)
  )
}

function getDivisionCountDescription(count: number): string | undefined {
  if (count === 0) return undefined
  return count === 1 ? '1 planilha' : `${count} planilhas`
}

export function getSpreadsheetId(departmentId: EntityId): EntityId {
  return departmentId.startsWith('dept-')
    ? departmentId.slice('dept-'.length)
    : departmentId
}

function toSearchParams(search: string | URLSearchParams): URLSearchParams {
  if (search instanceof URLSearchParams) {
    return new URLSearchParams(search)
  }

  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
}
