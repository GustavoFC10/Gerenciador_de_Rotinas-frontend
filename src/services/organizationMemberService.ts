import { HttpClient, httpClient } from './httpClient'
import type { ApiResponse } from './httpClient'
import type { DepartmentAccessRole, OrganizationRole } from '../types/domain'

const MEMBERS_ENDPOINT = '/api/v1/organization-members/'
const INVITATIONS_ENDPOINT = '/api/v1/membership-invitations/'

export type OrganizationMemberStatus =
  'pending' | 'active' | 'suspended' | 'inactive'

export interface DepartmentAccessResource {
  id: string
  departmentId: string
  departmentName: string
  role: DepartmentAccessRole
  createdAt: string
  updatedAt: string
}

export interface OrganizationMemberResource {
  id: string
  email: string
  displayName: string
  role: OrganizationRole
  status: OrganizationMemberStatus
  joinedAt: string | null
  departmentAccesses: DepartmentAccessResource[]
  createdAt: string
  updatedAt: string
}

export interface MembershipInvitationInput {
  email: string
  displayName: string
  role: OrganizationRole
}

export interface MembershipInvitationResource {
  id: string
  email: string
  displayName: string
  role: OrganizationRole
  expiresAt: string
  createdAt: string
}

interface ApiPage<T> {
  next: string | null
  results: T[]
}

export class OrganizationMemberService {
  constructor(private readonly client: HttpClient) {}

  async listAll(): Promise<OrganizationMemberResource[]> {
    const results: OrganizationMemberResource[] = []
    let nextPath: string | null = MEMBERS_ENDPOINT

    while (nextPath) {
      const response: ApiResponse<ApiPage<OrganizationMemberResource>> =
        await this.client.get<ApiPage<OrganizationMemberResource>>(nextPath)
      results.push(...response.data.results)
      nextPath = response.data.next
    }

    return results
  }

  get(id: string): Promise<ApiResponse<OrganizationMemberResource>> {
    return this.client.get<OrganizationMemberResource>(memberPath(id))
  }

  invite(
    input: MembershipInvitationInput,
  ): Promise<ApiResponse<MembershipInvitationResource>> {
    return this.client.post<MembershipInvitationResource>(
      INVITATIONS_ENDPOINT,
      input,
    )
  }

  update(
    id: string,
    input: Partial<Pick<OrganizationMemberResource, 'displayName' | 'role'>>,
  ): Promise<ApiResponse<OrganizationMemberResource>> {
    return this.client.patch<OrganizationMemberResource>(memberPath(id), input)
  }

  offboard(id: string): Promise<ApiResponse<OrganizationMemberResource>> {
    return this.client.post<OrganizationMemberResource>(
      `${memberPath(id)}offboard/`,
      {},
    )
  }

  setDepartmentAccess(
    memberId: string,
    departmentId: string,
    role: DepartmentAccessRole,
  ): Promise<ApiResponse<DepartmentAccessResource>> {
    return this.client.put<DepartmentAccessResource>(
      departmentAccessPath(memberId, departmentId),
      { role },
    )
  }

  removeDepartmentAccess(
    memberId: string,
    departmentId: string,
  ): Promise<ApiResponse<void>> {
    return this.client.delete<void>(
      departmentAccessPath(memberId, departmentId),
    )
  }
}

export const organizationMemberService = new OrganizationMemberService(
  httpClient,
)

function memberPath(id: string): string {
  return `${MEMBERS_ENDPOINT}${encodeURIComponent(id)}/`
}

function departmentAccessPath(memberId: string, departmentId: string): string {
  return `${memberPath(memberId)}department-accesses/${encodeURIComponent(departmentId)}/`
}
