import type { QueryClient } from '@tanstack/react-query'

import { queryKeys, type OrganizationQueryScope } from './queryKeys'
import type { AgendaProjection } from '../services/screenService'
import type { FileTarget } from '../types/files'
import type {
  Client,
  Department,
  Employee,
  Routine,
  RoutineControlResponse,
  Screen,
  Task,
} from '../types/domain'

type ResponseUpdater = (
  response: RoutineControlResponse,
) => RoutineControlResponse

/** Apply a fresh collection count without changing the task's version or ETag. */
export function updateTaskAttachmentCount(
  queryClient: QueryClient,
  scope: OrganizationQueryScope,
  destination: FileTarget,
  count: number,
): void {
  if (destination.purpose !== 'task_attachment') return
  const target = destination.target
  const attachmentCount = Math.max(0, Math.trunc(count))
  const matches = (task: Task) =>
    'occurrenceKey' in target
      ? task.occurrenceKey === target.occurrenceKey &&
        task.period === target.referenceMonth.slice(0, 7)
      : task.taskId === target.taskId &&
        task.competenceId === target.competenceId

  updateOperationalContexts(queryClient, scope, (current) => ({
    ...current,
    data: {
      ...current.data,
      tasks: current.data.tasks.map((task) =>
        matches(task)
          ? {
              ...task,
              indicators: { ...task.indicators, attachments: attachmentCount },
            }
          : task,
      ),
      spreadsheetProjections: current.data.spreadsheetProjections.map(
        (projection) => ({
          ...projection,
          cells: projection.cells.map((cell) => ({
            ...cell,
            tasks: cell.tasks.map((task) =>
              'occurrenceKey' in target &&
              task.occurrenceKey === target.occurrenceKey &&
              task.referenceMonth.slice(0, 7) ===
                target.referenceMonth.slice(0, 7)
                ? { ...task, attachmentCount }
                : task,
            ),
          })),
        }),
      ),
    },
  }))
  queryClient.setQueriesData<AgendaProjection>(
    { queryKey: [...queryKeys.scope(scope), 'agenda-projection'] },
    (current) =>
      current && 'taskId' in target
        ? {
            ...current,
            columns: current.columns.map((column) => ({
              ...column,
              tasks: column.tasks.map((task) =>
                task.id === target.taskId &&
                task.competenceId === target.competenceId
                  ? { ...task, attachmentCount }
                  : task,
              ),
            })),
          }
        : current,
  )
}

export function updateOperationalContexts(
  queryClient: QueryClient,
  scope: OrganizationQueryScope,
  updater: ResponseUpdater,
): void {
  queryClient.setQueriesData<RoutineControlResponse>(
    { queryKey: queryKeys.routineControlRoot(scope) },
    (current) => (current ? updater(current) : current),
  )
}

export function updateOperationalContext(
  queryClient: QueryClient,
  scope: OrganizationQueryScope,
  period: string,
  updater: ResponseUpdater,
): void {
  queryClient.setQueryData<RoutineControlResponse>(
    queryKeys.routineControl(scope, period),
    (current) => (current ? updater(current) : current),
  )
}

export function replaceTaskInOperationalContext({
  queryClient,
  scope,
  period,
  task,
  assignee,
}: {
  queryClient: QueryClient
  scope: OrganizationQueryScope
  period: string
  task: Task
  assignee?: Employee | null
}): void {
  updateOperationalContext(queryClient, scope, period, (current) => ({
    ...current,
    data: {
      ...current.data,
      employees: assignee
        ? upsertById(current.data.employees, assignee)
        : current.data.employees,
      tasks: upsertById(current.data.tasks, task),
    },
  }))
  invalidateAgendaProjectionsForTask(queryClient, scope, period, task)
}

export function appendTaskToOperationalContext({
  queryClient,
  scope,
  period,
  task,
  assignee,
}: {
  queryClient: QueryClient
  scope: OrganizationQueryScope
  period: string
  task: Task
  assignee?: Employee | null
}): void {
  updateOperationalContext(queryClient, scope, period, (current) => ({
    ...current,
    data: {
      ...current.data,
      employees: assignee
        ? upsertById(current.data.employees, assignee)
        : current.data.employees,
      tasks: current.data.tasks.some((item) => item.id === task.id)
        ? upsertById(current.data.tasks, task)
        : [...current.data.tasks, task],
    },
  }))
  invalidateAgendaProjectionsForTask(queryClient, scope, period, task)
}

export function upsertClientInOperationalContexts(
  queryClient: QueryClient,
  scope: OrganizationQueryScope,
  client: Client,
): void {
  updateOperationalContexts(queryClient, scope, (current) => ({
    ...current,
    data: {
      ...current.data,
      clients: upsertById(current.data.clients, client),
    },
  }))
}

export function markClientInactiveInOperationalContexts(
  queryClient: QueryClient,
  scope: OrganizationQueryScope,
  clientId: string,
): void {
  updateOperationalContexts(queryClient, scope, (current) => ({
    ...current,
    data: {
      ...current.data,
      clients: current.data.clients.map((client) =>
        client.id === clientId ? { ...client, active: false } : client,
      ),
    },
  }))
}

export function upsertRoutineInOperationalContexts(
  queryClient: QueryClient,
  scope: OrganizationQueryScope,
  routine: Routine,
): void {
  updateOperationalContexts(queryClient, scope, (current) => ({
    ...current,
    data: {
      ...current.data,
      routines: upsertById(current.data.routines, routine),
    },
  }))
}

/**
 * A API encerra todos os vínculos ativos ao arquivar uma rotina. Espelhamos
 * isso nos contextos já renderizados para que planilhas e catálogos não
 * continuem oferecendo a rotina enquanto a recarga acontece.
 */
export function markRoutineInactiveInOperationalContexts(
  queryClient: QueryClient,
  scope: OrganizationQueryScope,
  routineId: string,
): void {
  updateOperationalContexts(queryClient, scope, (current) => ({
    ...current,
    data: {
      ...current.data,
      routines: current.data.routines.map((routine) =>
        routine.id === routineId ? { ...routine, active: false } : routine,
      ),
      screens: current.data.screens.map((screen) => ({
        ...screen,
        routines: screen.routines.filter((routine) => routine.id !== routineId),
      })),
      spreadsheetProjections: current.data.spreadsheetProjections.map(
        (projection) => ({
          ...projection,
          columns: projection.columns.filter(
            (routine) => routine.id !== routineId,
          ),
          cells: projection.cells.filter(
            (cell) => cell.routineId !== routineId,
          ),
        }),
      ),
    },
  }))
  queryClient.setQueriesData<{ routineId: string }[]>(
    { queryKey: queryKeys.companyRoutineAssignmentsRoot(scope) },
    (current) =>
      current?.filter((assignment) => assignment.routineId !== routineId),
  )
}

export function upsertScreenInOperationalContexts(
  queryClient: QueryClient,
  scope: OrganizationQueryScope,
  screen: Screen,
): void {
  updateOperationalContexts(queryClient, scope, (current) => ({
    ...current,
    data: {
      ...current.data,
      screens: upsertById(current.data.screens, screen),
    },
  }))
}

export function upsertDepartmentInOperationalContexts(
  queryClient: QueryClient,
  scope: OrganizationQueryScope,
  department: Department,
): void {
  updateOperationalContexts(queryClient, scope, (current) => ({
    ...current,
    data: {
      ...current.data,
      departments: upsertById(current.data.departments, department),
    },
  }))
}

function upsertById<T extends { id: string }>(items: T[], nextItem: T): T[] {
  const existingIndex = items.findIndex((item) => item.id === nextItem.id)

  if (existingIndex === -1) return [...items, nextItem]

  return items.map((item) => (item.id === nextItem.id ? nextItem : item))
}

function invalidateAgendaProjectionsForTask(
  queryClient: QueryClient,
  scope: OrganizationQueryScope,
  period: string,
  task: Task,
): void {
  const response = queryClient.getQueryData<RoutineControlResponse>(
    queryKeys.routineControl(scope, period),
  )
  const agendaIds = response?.data.screens
    .filter(
      (screen) =>
        screen.type === 'agenda' && screen.departmentId === task.departmentId,
    )
    .map((screen) => screen.id)

  agendaIds?.forEach((screenId) => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.agendaProjection(scope, screenId, period),
      exact: true,
    })
  })
}
