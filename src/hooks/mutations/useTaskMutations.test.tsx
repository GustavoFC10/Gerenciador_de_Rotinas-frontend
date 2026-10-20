/** @vitest-environment happy-dom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useTaskMutations } from './useTaskMutations'
import { useRoutineControl } from '../useRoutineControl'
import RoutineClosedCardCompact from '../../components/routine-control/spreadsheet/RoutineClosedCardCompact'
import { queryKeys } from '../../query/queryKeys'
import { ApiError, type ApiResponse } from '../../services/httpClient'
import { taskService, type TaskResource } from '../../services/taskService'
import * as routineControlService from '../../services/routineControlService'
import type {
  RoutineControlResponse,
  ScheduledOccurrence,
  Task,
} from '../../types/domain'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

vi.mock('../useFileUploads', () => ({
  useFileUploads: () => ({ jobs: [] }),
}))

const scope = { organizationId: 'organization-1', membershipId: 'member-1' }
const period = '2026-08'
const queryKey = queryKeys.routineControl(scope, period)
let queryClient: QueryClient
let root: Root
let host: HTMLDivElement
let mutations: ReturnType<typeof useTaskMutations>
let routineControl: ReturnType<typeof useRoutineControl>
let otherPeriod: ReturnType<typeof useRoutineControl>
let otherOrganization: ReturnType<typeof useRoutineControl>
let otherMembership: ReturnType<typeof useRoutineControl>

beforeEach(async () => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
  queryClient.setQueryData(queryKey, createResponse())
  queryClient.setQueryData(
    queryKeys.routineControl(scope, '2026-09'),
    createResponse(),
  )
  const organizationScope = { ...scope, organizationId: 'another-organization' }
  const membershipScope = { ...scope, membershipId: 'another-member' }
  queryClient.setQueryData(
    queryKeys.routineControl(organizationScope, period),
    createResponse(),
  )
  queryClient.setQueryData(
    queryKeys.routineControl(membershipScope, period),
    createResponse(),
  )
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)

  function Harness() {
    mutations = useTaskMutations({ ...scope, period })
    routineControl = useRoutineControl(scope, period)
    otherPeriod = useRoutineControl(scope, '2026-09')
    otherOrganization = useRoutineControl(organizationScope, period)
    otherMembership = useRoutineControl(membershipScope, period)
    return routineControl.data?.tasks.map((task) => (
      <RoutineClosedCardCompact key={task.id} task={task} label={task.id} />
    ))
  }

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    )
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  queryClient.clear()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('useTaskMutations status transitions', () => {
  it('changes the visible status while the request is pending and saves the returned version', async () => {
    const request = deferred<ApiResponse<TaskResource>>()
    const transition = vi
      .spyOn(taskService, 'transition')
      .mockReturnValue(request.promise)
    const pending = await startTransition('completed')

    expect(getVisibleTasks()[0]).toMatchObject({
      status: 'completed',
      etag: '"1"',
    })
    expect(getTasks()[0].status).toBe('pending')
    expect(getCard().className).toContain('--status-completed-strong-bg')
    expect(otherPeriod.data?.tasks[0].status).toBe('pending')
    expect(otherOrganization.data?.tasks[0].status).toBe('pending')
    expect(otherMembership.data?.tasks[0].status).toBe('pending')
    expect(transition).toHaveBeenCalledWith(
      'competence-1',
      'task-1',
      { targetStatus: 'completed' },
      '"1"',
    )

    await act(async () => {
      request.resolve(apiResponse(createResource('completed'), '"2"'))
      await pending.promise
      await flushNotifications()
    })

    expect(getTasks()[0]).toMatchObject({
      status: 'completed',
      etag: '"2"',
      completedAt: '2026-08-10T12:00:00Z',
    })
    expect(getVisibleTasks()[0].status).toBe('completed')
    expect(getCard().className).toContain('--status-completed-strong-bg')
  })

  it('changes virtual occurrences immediately using their existing ETag', async () => {
    queryClient.setQueryData<RoutineControlResponse>(queryKey, (current) => ({
      ...current!,
      data: {
        ...current!.data,
        tasks: [
          {
            ...createTask(),
            id: 'occurrence-1',
            occurrenceKey: 'occurrence-1',
            taskId: null,
            competenceId: null,
            kind: 'scheduled',
            persistence: 'virtual',
          },
        ],
      },
    }))
    const request = deferred<ApiResponse<ScheduledOccurrence>>()
    const transition = vi
      .spyOn(taskService, 'transitionOccurrence')
      .mockReturnValue(request.promise)
    const pending = await startTransition('in_progress', 'occurrence-1')

    expect(getVisibleTasks()[0].status).toBe('in_progress')
    expect(getTasks()[0].status).toBe('pending')
    expect(transition).toHaveBeenCalledWith(
      period,
      'occurrence-1',
      { targetStatus: 'in_progress' },
      '"1"',
    )

    await act(async () => {
      request.resolve(apiResponse(createOccurrence(), '"2"'))
      await pending.promise
      await flushNotifications()
    })

    expect(getTasks()[0]).toMatchObject({ status: 'in_progress', etag: '"2"' })
  })

  it('reverts only the failed status and preserves other cards and attachment updates', async () => {
    const request = deferred<ApiResponse<TaskResource>>()
    vi.spyOn(taskService, 'transition').mockReturnValue(request.promise)
    const pending = await startTransition('completed')
    queryClient.setQueryData<RoutineControlResponse>(queryKey, (current) => ({
      ...current!,
      data: {
        ...current!.data,
        tasks: [
          { ...current!.data.tasks[0], indicators: { attachments: 3 } },
          { ...createTask(), id: 'task-2', status: 'in_progress' },
        ],
      },
    }))
    const error = new Error('Connection interrupted')

    await act(async () => {
      request.reject(error)
      await expect(pending.promise).rejects.toBe(error)
      await flushNotifications()
    })

    expect(getTasks()[0]).toMatchObject({
      status: 'pending',
      etag: '"1"',
      indicators: { attachments: 3 },
    })
    expect(getTasks()[1].status).toBe('in_progress')
    expect(getVisibleTasks()[0]).toMatchObject({
      status: 'pending',
      indicators: { attachments: 3 },
    })
    expect(getCard().className).toContain('--color-list-panel-bg')
  })

  it('preserves a newer task version when an older request fails', async () => {
    const request = deferred<ApiResponse<TaskResource>>()
    vi.spyOn(taskService, 'transition').mockReturnValue(request.promise)
    const pending = await startTransition('completed')
    queryClient.setQueryData<RoutineControlResponse>(queryKey, (current) => ({
      ...current!,
      data: {
        ...current!.data,
        tasks: [{ ...current!.data.tasks[0], etag: '"3"' }],
      },
    }))

    await act(async () => {
      request.reject(new Error('Request failed'))
      await expect(pending.promise).rejects.toThrow('Request failed')
      await flushNotifications()
    })

    expect(getTasks()[0]).toMatchObject({ status: 'pending', etag: '"3"' })
    expect(getVisibleTasks()[0]).toMatchObject({
      status: 'pending',
      etag: '"3"',
    })
  })

  it('keeps the chosen color through task replacement and refetch, then reveals fresh data on failure', async () => {
    const request = deferred<ApiResponse<TaskResource>>()
    vi.spyOn(taskService, 'transition').mockReturnValue(request.promise)
    const pending = await startTransition('completed')

    await act(async () => {
      queryClient.setQueryData<RoutineControlResponse>(queryKey, (current) => ({
        ...current!,
        data: {
          ...current!.data,
          tasks: [
            {
              ...createTask(),
              etag: '"2"',
              indicators: { attachments: 1 },
            },
          ],
        },
      }))
      await flushNotifications()
    })

    expect(getVisibleTasks()[0]).toMatchObject({
      status: 'completed',
      etag: '"2"',
      indicators: { attachments: 1 },
    })
    expect(getCard().className).toContain('--status-completed-strong-bg')

    const fresh = createResponse()
    fresh.data.tasks[0] = {
      ...createTask(),
      status: 'in_progress',
      etag: '"3"',
      indicators: { attachments: 2 },
    }
    vi.spyOn(routineControlService, 'getRoutineControl').mockResolvedValue(
      fresh,
    )
    await act(async () => {
      await routineControl.refetch()
      await flushNotifications()
    })

    expect(getTasks()[0]).toMatchObject({
      status: 'in_progress',
      etag: '"3"',
      indicators: { attachments: 2 },
    })
    expect(getVisibleTasks()[0]).toMatchObject({
      status: 'completed',
      etag: '"3"',
      indicators: { attachments: 2 },
    })
    expect(getCard().className).toContain('--status-completed-strong-bg')

    await act(async () => {
      request.reject(new Error('Request failed'))
      await expect(pending.promise).rejects.toThrow('Request failed')
      await flushNotifications()
    })

    expect(getVisibleTasks()[0]).toMatchObject({
      status: 'in_progress',
      etag: '"3"',
      indicators: { attachments: 2 },
    })
    expect(getCard().className).toContain('--status-progress-strong-bg')
  })

  it('loads the authoritative status after an ETag conflict instead of restoring a stale snapshot', async () => {
    const request = deferred<ApiResponse<TaskResource>>()
    vi.spyOn(taskService, 'transition').mockReturnValue(request.promise)
    vi.spyOn(taskService, 'get').mockResolvedValue(
      apiResponse(createResource('error'), '"3"'),
    )
    const pending = await startTransition('completed')

    await act(async () => {
      request.reject(conflictError())
      await expect(pending.promise).rejects.toThrow('alterada por outra pessoa')
      await flushNotifications()
    })

    expect(getTasks()[0]).toMatchObject({ status: 'error', etag: '"3"' })
    expect(getVisibleTasks()[0]).toMatchObject({ status: 'error', etag: '"3"' })
  })

  it('restores the previous status when refreshing an ETag conflict also fails', async () => {
    const request = deferred<ApiResponse<TaskResource>>()
    vi.spyOn(taskService, 'transition').mockReturnValue(request.promise)
    vi.spyOn(taskService, 'get').mockRejectedValue(new Error('Refresh failed'))
    const pending = await startTransition('completed')

    await act(async () => {
      request.reject(conflictError())
      await expect(pending.promise).rejects.toThrow('Refresh failed')
      await flushNotifications()
    })

    expect(getTasks()[0]).toMatchObject({ status: 'pending', etag: '"1"' })
    expect(getVisibleTasks()[0]).toMatchObject({
      status: 'pending',
      etag: '"1"',
    })
  })
})

async function startTransition(
  status: Task['status'],
  taskId = 'task-1',
): Promise<{ promise: Promise<Task> }> {
  let promise!: Promise<Task>
  await act(async () => {
    promise = mutations.transitionTask(taskId, status)
    void promise.catch(() => undefined)
    await flushNotifications()
  })
  return { promise }
}

function getTasks(): Task[] {
  return queryClient.getQueryData<RoutineControlResponse>(queryKey)!.data.tasks
}

function getVisibleTasks(): Task[] {
  return routineControl.data!.tasks
}

function getCard(): HTMLButtonElement {
  const card = host.querySelector<HTMLButtonElement>('button')
  if (!card) throw new Error('Task card not rendered')
  return card
}

function flushNotifications(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function createResponse(): RoutineControlResponse {
  return {
    data: {
      clients: [],
      routines: [],
      departments: [],
      employees: [],
      screens: [],
      spreadsheetProjections: [],
      tasks: [createTask()],
    },
    meta: { period, generatedAt: '2026-08-01T00:00:00Z' },
  }
}

function createTask(): Task {
  return {
    id: 'task-1',
    taskId: 'task-1',
    competenceId: 'competence-1',
    etag: '"1"',
    kind: 'ad_hoc',
    status: 'pending',
    period,
    clientId: 'company-1',
    routineId: null,
    departmentId: 'department-1',
    assigneeId: null,
    completedAt: null,
    dueDate: '2026-08-20',
    indicators: { attachments: 0 },
  }
}

function createResource(status: Task['status']): TaskResource {
  return {
    id: 'task-1',
    occurrenceKey: null,
    competenceId: 'competence-1',
    competence: '2026-08-01',
    kind: 'ad_hoc',
    status,
    title: 'Monthly task',
    description: '',
    observation: '',
    departmentId: 'department-1',
    departmentName: 'Fiscal',
    clientCompanyId: 'company-1',
    routineId: null,
    dueDate: '2026-08-20',
    assignee: null,
    links: [],
    version: 2,
    archivedAt: null,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-10T12:00:00Z',
    attachmentCount: 0,
  }
}

function apiResponse<T>(data: T, etag: string): ApiResponse<T> {
  return {
    data,
    etag,
    status: 200,
    requestId: null,
    headers: new Headers(),
  }
}

function createOccurrence(): ScheduledOccurrence {
  return {
    occurrenceKey: 'occurrence-1',
    taskId: null,
    etag: '"2"',
    persistence: 'virtual',
    referenceMonth: '2026-08-01',
    kind: 'scheduled',
    departmentId: 'department-1',
    departmentName: 'Fiscal',
    clientCompanyId: 'company-1',
    companyCode: '001',
    companyName: 'Company',
    companyLegalName: 'Company',
    routineId: 'routine-1',
    routineVersionId: 'routine-version-1',
    sourceAssignmentId: 'assignment-1',
    routineShotname: 'Monthly',
    routineName: 'Monthly task',
    routineVersionNumber: 1,
    routineDescription: '',
    title: 'Monthly task',
    description: '',
    observation: '',
    links: [],
    dueDate: '2026-08-20',
    status: 'in_progress',
    assignee: null,
    sourceRevision: 1,
    version: null,
    materializationReason: null,
    materializedAt: null,
    archivedAt: null,
    createdAt: null,
    updatedAt: null,
    isOverdue: false,
    attachmentCount: 0,
  }
}

function conflictError(): ApiError {
  return new ApiError({
    problem: { type: 'conflict', title: 'Conflict', status: 412 },
    requestId: null,
    response: new Response(null, { status: 412 }),
  })
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}
