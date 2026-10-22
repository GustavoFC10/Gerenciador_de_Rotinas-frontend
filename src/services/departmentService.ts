import { HttpClient, httpClient } from './httpClient'
import type { ImageReference } from '../types/files'
import type { ApiResponse } from './httpClient'
import type { DepartmentAccessRole, OrganizationRole } from '../types/domain'

const DEPARTMENTS_ENDPOINT = '/api/v1/departments/'

export interface DepartmentInput {
  name: string
  description?: string
}

export interface DepartmentResource {
  image?: ImageReference | null
  id: string
  name: string
  description: string
  accessRole: DepartmentAccessRole | null
}

export interface TaskAssigneeResource {
  id: string
  displayName: string
  organizationRole: OrganizationRole
  departmentRole: DepartmentAccessRole | null
}

export class DepartmentService {
  constructor(private readonly client: HttpClient) {}

  async listAll(): Promise<DepartmentResource[]> {
    const departments: DepartmentResource[] = []
    let next: string | null = DEPARTMENTS_ENDPOINT
    while (next) {
      const response: ApiResponse<{
        results: DepartmentResource[]
        next: string | null
      }> = await this.client.get(next)
      departments.push(...response.data.results)
      next = response.data.next
    }
    return departments
  }

  create(input: DepartmentInput): Promise<ApiResponse<DepartmentResource>> {
    return this.client.post<DepartmentResource>(DEPARTMENTS_ENDPOINT, input)
  }

  get(id: string): Promise<ApiResponse<DepartmentResource>> {
    return this.client.get<DepartmentResource>(departmentPath(id))
  }

  getTaskAssignees(
    id: string,
    signal?: AbortSignal,
  ): Promise<ApiResponse<TaskAssigneeResource[]>> {
    return this.client.get<TaskAssigneeResource[]>(
      `${departmentPath(id)}task-assignees/`,
      { signal },
    )
  }
}

export const departmentService = new DepartmentService(httpClient)

function departmentPath(id: string): string {
  return `${DEPARTMENTS_ENDPOINT}${encodeURIComponent(id)}/`
}
