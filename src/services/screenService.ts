import { HttpClient, httpClient } from './httpClient'
import type { ApiResponse } from './httpClient'
import type { TaskResource } from './taskService'
import type { Screen, ScreenType, SpreadsheetProjection } from '../types/domain'

const SCREENS_ENDPOINT = '/api/v1/screens/'

export interface ScreenInput {
  name: string
  type: ScreenType
  departmentId: string
  position?: number
  companyIds?: string[]
  routineIds?: string[]
}

export type ScreenPatch = Partial<
  Pick<
    ScreenInput,
    'name' | 'departmentId' | 'position' | 'companyIds' | 'routineIds'
  >
>

export interface AgendaProjection {
  type: 'agenda'
  screen: Omit<Screen, 'companies' | 'routines'>
  competenceId: string | null
  period: string
  columns: Array<{
    status: TaskResource['status']
    count: number
    tasks: TaskResource[]
    hasMore: boolean
  }>
}

export class ScreenService {
  constructor(private readonly client: HttpClient) {}

  get(id: string): Promise<ApiResponse<Screen>> {
    return this.client.get<Screen>(screenPath(id))
  }

  create(input: ScreenInput): Promise<ApiResponse<Screen>> {
    return this.client.post<Screen>(SCREENS_ENDPOINT, input)
  }

  update(
    id: string,
    input: ScreenPatch,
    etag: string,
  ): Promise<ApiResponse<Screen>> {
    return this.client.patch<Screen>(screenPath(id), input, { ifMatch: etag })
  }

  archive(id: string, etag: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(screenPath(id), { ifMatch: etag })
  }

  restore(id: string, etag: string): Promise<ApiResponse<Screen>> {
    return this.client.post<Screen>(
      `${screenPath(id)}restore/`,
      {},
      { ifMatch: etag },
    )
  }

  getProjection(
    id: string,
    period: string,
  ): Promise<ApiResponse<SpreadsheetProjection | AgendaProjection>> {
    return this.client.get<SpreadsheetProjection | AgendaProjection>(
      `${screenPath(id)}projection/`,
      { query: { period } },
    )
  }
}

export const screenService = new ScreenService(httpClient)

function screenPath(id: string): string {
  return `${SCREENS_ENDPOINT}${encodeURIComponent(id)}/`
}
