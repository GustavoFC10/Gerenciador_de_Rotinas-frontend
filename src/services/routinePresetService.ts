import { HttpClient, httpClient } from './httpClient'
import type { ApiResponse } from './httpClient'

const ROUTINE_PRESETS_ENDPOINT = '/api/v1/routine-presets/'

export interface RoutinePresetItemResource {
  routineId: string
  routineVersionId: string
  routineShotname: string
  routineName: string
  versionNumber: number
  position: number
}

export interface RoutinePresetResource {
  id: string
  name: string
  description: string
  version: number
  items: RoutinePresetItemResource[]
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RoutinePresetInput {
  name: string
  description?: string
  routineIds: string[]
}

interface Page<T> {
  next: string | null
  results: T[]
}

export class RoutinePresetService {
  constructor(private readonly client: HttpClient) {}

  async list(includeArchived = false): Promise<RoutinePresetResource[]> {
    const results: RoutinePresetResource[] = []
    let next: string | null = ROUTINE_PRESETS_ENDPOINT

    while (next) {
      const response: ApiResponse<Page<RoutinePresetResource>> =
        await this.client.get<Page<RoutinePresetResource>>(next, {
          query:
            next === ROUTINE_PRESETS_ENDPOINT ? { includeArchived } : undefined,
        })
      results.push(...response.data.results)
      next = response.data.next
    }

    return results
  }

  create(
    input: RoutinePresetInput,
  ): Promise<ApiResponse<RoutinePresetResource>> {
    return this.client.post<RoutinePresetResource>(
      ROUTINE_PRESETS_ENDPOINT,
      input,
    )
  }
}

export const routinePresetService = new RoutinePresetService(httpClient)
