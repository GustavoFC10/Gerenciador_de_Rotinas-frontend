import { HttpClient, httpClient } from './httpClient'
import type { ApiResponse } from './httpClient'
import type { RoutineRecurrence } from '../types/domain'

const ROUTINES_ENDPOINT = '/api/v1/routines/'

export interface RoutineInput {
  departmentId: string
  name: string
  shotname: string
  description: string
  recurrence: RoutineRecurrence
  defaultDueDays: number
  /**
   * Campo documentado em ENDPOINTS.md para a regra publicada da rotina.
   * O OpenAPI ainda precisa ser sincronizado com esse contrato.
   */
  defaultAssigneeMemberId?: string | null
  recurrenceMonths?: number[]
}

export interface RoutineVersionInput {
  description: string
  recurrence: RoutineRecurrence
  defaultDueDays: number
  defaultAssigneeMemberId?: string | null
  recurrenceMonths?: number[]
}

export interface RoutineResource {
  id: string
  departmentId: string
  departmentName: string
  name: string
  shotname: string
  version: number
  currentVersion: RoutineVersionResource
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RoutineVersionResource {
  id: string
  routineId: string
  versionNumber: number
  description: string
  recurrence: RoutineRecurrence
  defaultDueDays: number
  defaultAssigneeMemberId?: string | null
  recurrenceMonths: number[]
  publishedAt: string
  publishedById: string | null
}

export class RoutineService {
  constructor(private readonly client: HttpClient) {}

  get(id: string): Promise<ApiResponse<RoutineResource>> {
    return this.client.get<RoutineResource>(routinePath(id))
  }

  create(input: RoutineInput): Promise<ApiResponse<RoutineResource>> {
    return this.client.post<RoutineResource>(ROUTINES_ENDPOINT, input)
  }

  updateIdentity(
    id: string,
    input: Partial<Pick<RoutineInput, 'name' | 'shotname'>>,
    etag: string,
  ): Promise<ApiResponse<RoutineResource>> {
    return this.client.patch<RoutineResource>(routinePath(id), input, {
      ifMatch: etag,
    })
  }

  publishVersion(
    id: string,
    input: RoutineVersionInput,
    etag: string,
  ): Promise<ApiResponse<RoutineResource>> {
    return this.client.post<RoutineResource>(
      `${routinePath(id)}versions/`,
      input,
      { ifMatch: etag },
    )
  }

  archive(id: string, etag: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(routinePath(id), { ifMatch: etag })
  }

  restore(id: string, etag: string): Promise<ApiResponse<RoutineResource>> {
    return this.client.post<RoutineResource>(
      `${routinePath(id)}restore/`,
      {},
      { ifMatch: etag },
    )
  }
}

export const routineService = new RoutineService(httpClient)

function routinePath(id: string): string {
  return `${ROUTINES_ENDPOINT}${encodeURIComponent(id)}/`
}
