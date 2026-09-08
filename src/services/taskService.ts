import { HttpClient, httpClient } from './httpClient'
import type { ApiResponse } from './httpClient'
import type {
  RoutineStatus,
  ScheduledOccurrence,
  TaskLinkInput,
} from '../types/domain'

export interface TaskPatchInput {
  title?: string
  description?: string
  observation?: string
  dueDate?: string
  assigneeMemberId?: string | null
  links?: TaskLinkInput[]
}

export interface TaskTransitionInput {
  targetStatus: RoutineStatus
}

export interface AdHocTaskInput extends TaskPatchInput {
  title: string
  departmentId?: string
  clientCompanyId?: string
  routineId?: string
}

export interface TaskResource {
  id: string
  occurrenceKey: string | null
  competenceId: string
  competence: string
  kind: 'ad_hoc' | 'scheduled'
  status: RoutineStatus
  title: string
  description: string
  observation: string
  departmentId: string
  departmentName: string
  clientCompanyId: string | null
  routineId: string | null
  dueDate: string
  assignee: { id: string; displayName: string } | null
  links: TaskLinkInput[]
  version: number
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CursorPage<T> {
  next: string | null
  previous: string | null
  results: T[]
}

export class TaskService {
  constructor(private readonly client: HttpClient) {}

  updateOccurrence(
    period: string,
    occurrenceKey: string,
    input: TaskPatchInput,
    etag: string,
  ): Promise<ApiResponse<ScheduledOccurrence>> {
    return this.client.patch<ScheduledOccurrence>(
      occurrencePath(period, occurrenceKey),
      input,
      { ifMatch: etag },
    )
  }

  getOccurrence(
    period: string,
    occurrenceKey: string,
  ): Promise<ApiResponse<ScheduledOccurrence>> {
    return this.client.get<ScheduledOccurrence>(
      occurrencePath(period, occurrenceKey),
    )
  }

  transitionOccurrence(
    period: string,
    occurrenceKey: string,
    input: TaskTransitionInput,
    etag: string,
  ): Promise<ApiResponse<ScheduledOccurrence>> {
    return this.client.post<ScheduledOccurrence>(
      `${occurrencePath(period, occurrenceKey)}transition/`,
      input,
      { ifMatch: etag },
    )
  }

  createAdHoc(
    competenceId: string,
    input: AdHocTaskInput,
    idempotencyKey: string,
  ): Promise<ApiResponse<TaskResource>> {
    return this.client.post<TaskResource>(
      `${competencePath(competenceId)}tasks/`,
      input,
      { idempotencyKey },
    )
  }

  listAdHoc(
    competenceId: string,
  ): Promise<ApiResponse<CursorPage<TaskResource>>> {
    return this.client.get<CursorPage<TaskResource>>(
      `${competencePath(competenceId)}tasks/`,
      { query: { kind: 'ad_hoc', pageSize: 100 } },
    )
  }

  get(
    competenceId: string,
    taskId: string,
  ): Promise<ApiResponse<TaskResource>> {
    return this.client.get<TaskResource>(taskPath(competenceId, taskId))
  }

  update(
    competenceId: string,
    taskId: string,
    input: TaskPatchInput,
    etag: string,
  ): Promise<ApiResponse<TaskResource>> {
    return this.client.patch<TaskResource>(
      taskPath(competenceId, taskId),
      input,
      { ifMatch: etag },
    )
  }

  transition(
    competenceId: string,
    taskId: string,
    input: TaskTransitionInput,
    etag: string,
  ): Promise<ApiResponse<TaskResource>> {
    return this.client.post<TaskResource>(
      `${taskPath(competenceId, taskId)}transition/`,
      input,
      { ifMatch: etag },
    )
  }

  archive(
    competenceId: string,
    taskId: string,
    etag: string,
  ): Promise<ApiResponse<void>> {
    return this.client.post<void>(`${taskPath(competenceId, taskId)}archive/`, {
      ifMatch: etag,
    })
  }
}

export const taskService = new TaskService(httpClient)

function competencePath(competenceId: string): string {
  return `/api/v1/competences/${encodeURIComponent(competenceId)}/`
}

function occurrencePath(period: string, occurrenceKey: string): string {
  return `/api/v1/competences/by-period/${encodeURIComponent(period)}/task-occurrences/${encodeURIComponent(occurrenceKey)}/`
}

function taskPath(competenceId: string, taskId: string): string {
  return `${competencePath(competenceId)}tasks/${encodeURIComponent(taskId)}/`
}
