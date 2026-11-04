import { HttpClient, httpClient } from './httpClient'
import type { ApiResponse } from './httpClient'

const CLIENT_COMPANIES_ENDPOINT = '/api/v1/client-companies/'

export interface ClientCompanyInput {
  code?: string | null
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

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type CompanyStatus = 'active' | 'archived'
export type CompanyRole = 'viewer' | 'editor' | 'manager'
export interface CompanyPermissions {
  role: CompanyRole | null
  read: boolean
  create: boolean
  edit: boolean
  archive: boolean
  restore: boolean
  readArchived: boolean
  readContacts: boolean
  createContact: boolean
  editContact: boolean
  archiveContact: boolean
  restoreContact: boolean
  readArchivedContacts: boolean
  readEntries: boolean
}
export interface CompanyCatalog {
  contractVersion: 1
  statuses: Record<CompanyStatus, string>
  roles: CompanyRole[]
  permissions: CompanyPermissions
}
export interface CompanyFilters {
  status?: CompanyStatus[]
  search?: string
  ordering?:
    | 'code'
    | 'name'
    | 'legalName'
    | 'cnpj'
    | 'status'
    | '-code'
    | '-name'
    | '-legalName'
    | '-cnpj'
    | '-status'
  page?: number
  pageSize?: number
}

export interface ClientCompanyResource {
  id: string
  code: string | null
  name: string
  legalName: string
  cnpj: string
  email: string
  mobilePhone: string
  taxRegime: string
  version: number
  status: CompanyStatus
  permissions?: CompanyPermissions
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export class CompanyService {
  constructor(private readonly client: HttpClient) {}

  catalog(): Promise<ApiResponse<CompanyCatalog>> {
    return this.client.get<CompanyCatalog>(
      `${CLIENT_COMPANIES_ENDPOINT}catalog/`,
    )
  }

  list(
    filters: CompanyFilters = {},
  ): Promise<ApiResponse<PaginatedResponse<ClientCompanyResource>>> {
    const query = new URLSearchParams()
    for (const status of filters.status ?? ['active'])
      query.append('status', status)
    for (const [key, value] of Object.entries(filters)) {
      if (key !== 'status' && value !== undefined) query.set(key, String(value))
    }
    return this.client.get(`${CLIENT_COMPANIES_ENDPOINT}?${query}`)
  }

  listAll(includeArchived = false): Promise<ClientCompanyResource[]> {
    const query = new URLSearchParams({ status: 'active' })
    if (includeArchived) query.append('status', 'archived')

    return this.collectPages<ClientCompanyResource>(
      `${CLIENT_COMPANIES_ENDPOINT}?${query.toString()}`,
    )
  }

  get(id: string): Promise<ApiResponse<ClientCompanyResource>> {
    return this.client.get<ClientCompanyResource>(companyPath(id))
  }

  create(
    input: ClientCompanyInput,
    idempotencyKey: string,
  ): Promise<ApiResponse<ClientCompanyResource>> {
    if (
      typeof idempotencyKey !== 'string' ||
      !/^[A-Za-z0-9._:-]{1,128}$/.test(idempotencyKey)
    ) {
      throw new Error(
        'Informe uma chave de idempotência válida para criar a empresa.',
      )
    }
    return this.client.post<ClientCompanyResource>(
      CLIENT_COMPANIES_ENDPOINT,
      input,
      { idempotencyKey },
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
    changes: Pick<ClientCompanyInput, 'code'> = {},
  ): Promise<ApiResponse<ClientCompanyResource>> {
    return this.client.post<ClientCompanyResource>(
      `${companyPath(id)}restore/`,
      changes,
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
