import { isTerminalRoutineStatus } from '../constants/routineStatus'
import type {
  AppUser,
  RoutineControlData,
  RoutineListItem,
  Task,
} from '../types/domain'
import type { SpreadsheetNavigationItem } from '../types/navigation'
import { canAccessDepartment, isLeader } from './permissions'
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

export interface HomePersonalOverview {
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
  personalTotal: number
  personalOpen: number
  personalFinalized: number
  personalAttention: number
  personalCompletionPercentage: number
}

export interface HomeRoleOverview {
  total: number
  open: number
  finalized: number
  errors: number
  overdue: number
  unassigned: number
  completionPercentage: number
  priorities: HomePriorityItem[]
}

export interface HomeOverview {
  referenceDate: string
  personal: HomePersonalOverview
  spreadsheets: HomeSpreadsheetSummary[]
  role: HomeRoleOverview | null
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
  const personalItems = scopedItems.filter(
    (item) => item.assigneeId === user.employeeId,
  )

  return {
    referenceDate,
    personal: buildPersonalOverview(
      personalItems,
      referenceDate,
      priorityLimit,
    ),
    spreadsheets: buildSpreadsheetSummaries({
      data,
      user,
      spreadsheets,
      personalItems,
      referenceDate,
    }),
    role: isLeader(user) ? buildRoleOverview(scopedItems, referenceDate) : null,
  }
}

function buildPersonalOverview(
  items: RoutineListItem[],
  referenceDate: string,
  priorityLimit: number,
): HomePersonalOverview {
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
  personalItems,
  referenceDate,
}: {
  data: RoutineControlData
  user: AppUser
  spreadsheets: SpreadsheetNavigationItem[]
  personalItems: RoutineListItem[]
  referenceDate: string
}): HomeSpreadsheetSummary[] {
  return spreadsheets
    .filter((spreadsheet) =>
      canAccessDepartment(user, spreadsheet.departmentId),
    )
    .map((spreadsheet) => {
      const routines = data.routines.filter(
        (routine) => routine.departmentId === spreadsheet.departmentId,
      )
      const routineIds = new Set(routines.map((routine) => routine.id))
      const departmentHasDivisions = (data.divisions ?? []).some(
        (division) => division.departmentId === spreadsheet.departmentId,
      )
      const clientIds = departmentHasDivisions
        ? new Set(
            data.clients
              .filter((client) =>
                client.divisionAssignments?.some(
                  (assignment) =>
                    assignment.departmentId === spreadsheet.departmentId,
                ),
              )
              .map((client) => client.id),
          )
        : new Set(
            data.clientRoutineLinks
              .filter((link) => routineIds.has(link.routineId))
              .map((link) => link.clientId),
          )
      const personalTasks = personalItems.filter(
        (item) =>
          !item.task.isLoose &&
          item.task.departmentId === spreadsheet.departmentId,
      )
      const personalFinalized = personalTasks.filter((item) =>
        isTerminalRoutineStatus(item.status),
      ).length
      const personalAttention = new Set(
        personalTasks
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
        routines: routines.length,
        personalTotal: personalTasks.length,
        personalOpen: personalTasks.length - personalFinalized,
        personalFinalized,
        personalAttention,
        personalCompletionPercentage: getPercentage(
          personalFinalized,
          personalTasks.length,
        ),
      }
    })
}

function buildRoleOverview(
  scopedItems: RoutineListItem[],
  referenceDate: string,
): HomeRoleOverview {
  const operationalItems = scopedItems.filter((item) => !item.task.isLoose)
  const finalized = operationalItems.filter((item) =>
    isTerminalRoutineStatus(item.status),
  )
  const open = operationalItems.filter(
    (item) => !isTerminalRoutineStatus(item.status),
  )

  return {
    total: operationalItems.length,
    open: open.length,
    finalized: finalized.length,
    errors: open.filter((item) => item.status === 'error').length,
    overdue: open.filter((item) => item.dueDate < referenceDate).length,
    unassigned: open.filter((item) => item.assigneeId === null).length,
    completionPercentage: getPercentage(
      finalized.length,
      operationalItems.length,
    ),
    priorities: buildPriorities(open, referenceDate, 3),
  }
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
        left.companyCode.localeCompare(right.companyCode, 'pt-BR') ||
        left.routineName.localeCompare(right.routineName, 'pt-BR')
      )
    })
    .slice(0, limit)
    .map((item) => ({
      item,
      task: item.task,
      title: item.task.isLoose
        ? (item.task.title ?? 'Tarefa avulsa')
        : (item.client?.name ?? 'Empresa não identificada'),
      context: item.task.isLoose
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
