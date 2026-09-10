import { isTerminalRoutineStatus } from '../constants/routineStatus'
import type {
  AppUser,
  RoutineControlData,
  RoutineListItem,
  Task,
} from '../types/domain'
import type { SpreadsheetNavigationItem } from '../types/navigation'
import { compareCompanyCodes } from './companyCode'
import { canAccessDepartment } from './permissions'
import { buildRoutineListViewData, ROUTINE_LIST_MODE } from './routineListItems'

export type HomePriorityKind =
  'error' | 'overdue' | 'today' | 'soon' | 'in_progress' | 'pending'

export interface HomePriorityItem {
  item: RoutineListItem
  task: Task
  title: string
  context: string
  kind: HomePriorityKind
  isOverdue: boolean
}

export interface HomeDepartmentOverview {
  total: number
  open: number
  finalized: number
  pending: number
  inProgress: number
  errors: number
  overdue: number
  dueToday: number
  attention: number
  completionPercentage: number
  priorities: HomePriorityItem[]
}

export interface HomeSpreadsheetSummary {
  spreadsheet: SpreadsheetNavigationItem
  clients: number
  routines: number
  total: number
  open: number
  finalized: number
  attention: number
  completionPercentage: number
}

export interface HomeOverview {
  referenceDate: string
  collective: HomeDepartmentOverview
  spreadsheets: HomeSpreadsheetSummary[]
}

export function buildHomeOverview({
  data,
  user,
  competence,
  referenceDate,
  spreadsheets,
  priorityLimit = 6,
}: {
  data: RoutineControlData
  user: AppUser
  competence: string
  referenceDate: string
  spreadsheets: SpreadsheetNavigationItem[]
  priorityLimit?: number
}): HomeOverview {
  const globalItems = buildRoutineListViewData({
    data,
    filter: { type: ROUTINE_LIST_MODE.GLOBAL },
  }).items
  const periodItems = globalItems.filter((item) => item.period === competence)
  const scopedItems = periodItems.filter((item) =>
    canAccessDepartment(user, item.task.departmentId),
  )

  return {
    referenceDate,
    collective: buildDepartmentOverview(
      scopedItems,
      referenceDate,
      priorityLimit,
    ),
    spreadsheets: buildSpreadsheetSummaries({
      data,
      user,
      spreadsheets,
      departmentItems: scopedItems,
      referenceDate,
    }),
  }
}

function buildDepartmentOverview(
  items: RoutineListItem[],
  referenceDate: string,
  priorityLimit: number,
): HomeDepartmentOverview {
  const finalized = items.filter((item) => isTerminalRoutineStatus(item.status))
  const open = items.filter((item) => !isTerminalRoutineStatus(item.status))
  const attentionIds = new Set(
    open
      .filter(
        (item) => item.status === 'error' || item.dueDate <= referenceDate,
      )
      .map((item) => item.id),
  )

  return {
    total: items.length,
    open: open.length,
    finalized: finalized.length,
    pending: open.filter((item) => item.status === 'pending').length,
    inProgress: open.filter((item) => item.status === 'in_progress').length,
    errors: open.filter((item) => item.status === 'error').length,
    overdue: open.filter((item) => item.dueDate < referenceDate).length,
    dueToday: open.filter((item) => item.dueDate === referenceDate).length,
    attention: attentionIds.size,
    completionPercentage: getPercentage(finalized.length, items.length),
    priorities: buildPriorities(open, referenceDate, priorityLimit),
  }
}

function buildSpreadsheetSummaries({
  data,
  user,
  spreadsheets,
  departmentItems,
  referenceDate,
}: {
  data: RoutineControlData
  user: AppUser
  spreadsheets: SpreadsheetNavigationItem[]
  departmentItems: RoutineListItem[]
  referenceDate: string
}): HomeSpreadsheetSummary[] {
  return spreadsheets
    .filter((spreadsheet) =>
      canAccessDepartment(user, spreadsheet.departmentId),
    )
    .map((spreadsheet) => {
      const screenIds = new Set(spreadsheet.screens.map((screen) => screen.id))
      const selectedScreens = data.screens.filter((screen) =>
        screenIds.has(screen.id),
      )
      const clientIds = new Set(
        selectedScreens.flatMap((screen) =>
          screen.companies.map((company) => company.id),
        ),
      )
      const routineIds = new Set(
        selectedScreens.flatMap((screen) =>
          screen.routines.map((routine) => routine.id),
        ),
      )
      const departmentTasks = departmentItems.filter(
        (item) =>
          item.task.departmentId === spreadsheet.departmentId &&
          (clientIds.has(item.task.clientId ?? '') ||
            routineIds.has(item.task.routineId ?? '')),
      )
      const finalized = departmentTasks.filter((item) =>
        isTerminalRoutineStatus(item.status),
      ).length
      const attention = new Set(
        departmentTasks
          .filter(
            (item) =>
              !isTerminalRoutineStatus(item.status) &&
              (item.status === 'error' || item.dueDate <= referenceDate),
          )
          .map((item) => item.id),
      ).size

      return {
        spreadsheet,
        clients: clientIds.size,
        routines: routineIds.size,
        total: departmentTasks.length,
        open: departmentTasks.length - finalized,
        finalized,
        attention,
        completionPercentage: getPercentage(finalized, departmentTasks.length),
      }
    })
}

function buildPriorities(
  items: RoutineListItem[],
  referenceDate: string,
  limit: number,
): HomePriorityItem[] {
  return [...items]
    .sort((left, right) => {
      const priorityDifference =
        getPriorityWeight(left, referenceDate) -
        getPriorityWeight(right, referenceDate)

      if (priorityDifference !== 0) return priorityDifference

      return (
        left.dueDate.localeCompare(right.dueDate) ||
        compareCompanyCodes(left.companyCode, right.companyCode) ||
        left.routineName.localeCompare(right.routineName, 'pt-BR')
      )
    })
    .slice(0, limit)
    .map((item) => ({
      item,
      task: item.task,
      title:
        item.task.kind === 'ad_hoc'
          ? (item.task.title ?? 'Tarefa avulsa')
          : (item.client?.name ?? 'Empresa não identificada'),
      context:
        item.task.kind === 'ad_hoc'
          ? `Tarefa avulsa · ${item.departmentName}`
          : `${item.routine?.name ?? item.routineName} · ${item.departmentName}`,
      kind: getPriorityKind(item, referenceDate),
      isOverdue: item.dueDate < referenceDate,
    }))
}

function getPriorityWeight(
  item: RoutineListItem,
  referenceDate: string,
): number {
  const isOverdue = item.dueDate < referenceDate

  if (isOverdue && item.status === 'error') return 0
  if (isOverdue) return 1
  if (item.status === 'error') return 2
  if (item.dueDate === referenceDate) return 3
  if (isDueSoon(item.dueDate, referenceDate)) return 4
  if (item.status === 'in_progress') return 5
  return 6
}

function getPriorityKind(
  item: RoutineListItem,
  referenceDate: string,
): HomePriorityKind {
  if (item.status === 'error') return 'error'
  if (item.dueDate < referenceDate) return 'overdue'
  if (item.dueDate === referenceDate) return 'today'
  if (isDueSoon(item.dueDate, referenceDate)) return 'soon'
  if (item.status === 'in_progress') return 'in_progress'
  return 'pending'
}

function isDueSoon(dueDate: string, referenceDate: string): boolean {
  const difference = getIsoDateDifference(referenceDate, dueDate)
  return difference > 0 && difference <= 3
}

function getIsoDateDifference(start: string, end: string): number {
  const startDate = new Date(`${start}T00:00:00Z`)
  const endDate = new Date(`${end}T00:00:00Z`)

  return Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000)
}

function getPercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}
