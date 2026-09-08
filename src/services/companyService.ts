import { HttpClient, httpClient } from './httpClient'
import type { ApiResponse } from './httpClient'

const CLIENT_COMPANIES_ENDPOINT = '/api/v1/client-companies/'

export interface ClientCompanyInput {
  code?: string
  name: string
  legalName?: string
  cnpj?: string
  email?: string
  mobilePhone?: string
  taxRegime?: string
}

export type ClientCompanyPatch = Partial<ClientCompanyInput>

export interface ClientRoutineAssignmentInput {
  routineId: string
  startsOn: string
  endsOn?: string | null
}

export interface ClientRoutineAssignmentResource {
  id: string
  companyId: string
  routineId: string
  routineShotname: string
  routineName: string
  departmentId: string
  departmentName: string
  currentRoutineVersionId: string
  sourcePresetId: string | null
  startsOn: string
  endsOn: string | null
  cancelledAt: string | null
  version: number
  createdAt: string
  updatedAt: string
}

interface PaginatedResponse<T> {
  next: string | null
  results: T[]
}

export interface ClientCompanyResource {
  id: string
  code: string
  name: string
  legalName: string
  cnpj: string
  email: string
  mobilePhone: string
  taxRegime: string
  version: number
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export class CompanyService {
  constructor(private readonly client: HttpClient) {}

  listAll(includeArchived = false): Promise<ClientCompanyResource[]> {
    const query = new URLSearchParams({
      includeArchived: String(includeArchived),
    })

    return this.collectPages<ClientCompanyResource>(
      `${CLIENT_COMPANIES_ENDPOINT}?${query.toString()}`,
    )
  }

  get(id: string): Promise<ApiResponse<ClientCompanyResource>> {
    return this.client.get<ClientCompanyResource>(companyPath(id))
  }

  create(
    input: ClientCompanyInput,
  ): Promise<ApiResponse<ClientCompanyResource>> {
    return this.client.post<ClientCompanyResource>(
      CLIENT_COMPANIES_ENDPOINT,
      input,
    )
  }

  update(
    id: string,
    input: ClientCompanyPatch,
    etag: string,
  ): Promise<ApiResponse<ClientCompanyResource>> {
    return this.client.patch<ClientCompanyResource>(companyPath(id), input, {
      ifMatch: etag,
    })
  }

  archive(id: string, etag: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(companyPath(id), { ifMatch: etag })
  }

  restore(
    id: string,
    etag: string,
  ): Promise<ApiResponse<ClientCompanyResource>> {
    return this.client.post<ClientCompanyResource>(
      `${companyPath(id)}restore/`,
      {},
      { ifMatch: etag },
    )
  }

  createRoutineAssignment(
    companyId: string,
    input: ClientRoutineAssignmentInput,
  ): Promise<ApiResponse<ClientRoutineAssignmentResource>> {
    return this.client.post<ClientRoutineAssignmentResource>(
      `${companyPath(companyId)}routine-assignments/`,
      input,
    )
  }

  listRoutineAssignments(
    companyId: string,
  ): Promise<ClientRoutineAssignmentResource[]> {
    return this.collectPages<ClientRoutineAssignmentResource>(
      companyPath(companyId) + 'routine-assignments/',
    )
  }

  getRoutineAssignment(
    companyId: string,
    assignmentId: string,
  ): Promise<ApiResponse<ClientRoutineAssignmentResource>> {
    return this.client.get<ClientRoutineAssignmentResource>(
      routineAssignmentPath(companyId, assignmentId),
    )
  }

  endRoutineAssignment(
    companyId: string,
    assignmentId: string,
    endsOn: string,
    etag: string,
  ): Promise<ApiResponse<ClientRoutineAssignmentResource>> {
    return this.client.post<ClientRoutineAssignmentResource>(
      routineAssignmentPath(companyId, assignmentId) + 'end/',
      { endsOn },
      { ifMatch: etag },
    )
  }

  removeRoutineAssignment(
    companyId: string,
    assignmentId: string,
    etag: string,
  ): Promise<ApiResponse<void>> {
    return this.client.delete<void>(
      routineAssignmentPath(companyId, assignmentId),
      { ifMatch: etag },
    )
  }

  private async collectPages<T>(initialPath: string): Promise<T[]> {
    const results: T[] = []
    let nextPath: string | null = initialPath

    while (nextPath) {
      const response: ApiResponse<PaginatedResponse<T>> =
        await this.client.get<PaginatedResponse<T>>(nextPath)
      results.push(...response.data.results)
      nextPath = response.data.next
    }

    return results
  }
}

export const companyService = new CompanyService(httpClient)

function companyPath(id: string): string {
  return `${CLIENT_COMPANIES_ENDPOINT}${encodeURIComponent(id)}/`
}

function routineAssignmentPath(
  companyId: string,
  assignmentId: string,
): string {
  return (
    companyPath(companyId) +
    'routine-assignments/' +
    encodeURIComponent(assignmentId) +
    '/'
  )
}
