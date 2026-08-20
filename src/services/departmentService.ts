import { HttpClient, httpClient } from './httpClient'
import type { ApiResponse } from './httpClient'
import type {
  DepartmentAccessRole,
  OrganizationRole,
} from '../types/domain'

const DEPARTMENTS_ENDPOINT = '/api/v1/departments/'

export interface DepartmentInput {
  name: string
  description?: string
}

export interface DepartmentResource {
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

  create(input: DepartmentInput): Promise<ApiResponse<DepartmentResource>> {
    return this.client.post<DepartmentResource>(DEPARTMENTS_ENDPOINT, input)
  }

  get(id: string): Promise<ApiResponse<DepartmentResource>> {
    return this.client.get<DepartmentResource>(departmentPath(id))
  }

  getTaskAssignees(id: string): Promise<ApiResponse<TaskAssigneeResource[]>> {
    return this.client.get<TaskAssigneeResource[]>(
      `${departmentPath(id)}task-assignees/`,
    )
  }
}

export const departmentService = new DepartmentService(httpClient)

function departmentPath(id: string): string {
  return `${DEPARTMENTS_ENDPOINT}${encodeURIComponent(id)}/`
}
