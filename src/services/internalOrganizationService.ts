import { HttpClient, httpClient } from './httpClient'
import type { ApiResponse } from './httpClient'
import type { OrganizationRole } from '../types/domain'
import type { OrganizationMemberStatus } from './organizationMemberService'

const INTERNAL_ORGANIZATIONS_ENDPOINT = '/api/internal/v1/organizations/'
const INTERNAL_INVITATIONS_ENDPOINT = '/api/internal/v1/invitations/'

export interface InternalOrganizationListResource {
  id: string
  name: string
  slug: string
  timezone: string
  status: string
  memberCount: number
  departmentCount: number
  createdAt: string
}

export interface InternalInvitationResource {
  id: string
  email: string
  expiresAt: string
  createdAt: string
  status: string
}

export interface InternalOwnerResource {
  id: string
  email: string
  displayName: string
  role: OrganizationRole
  status: OrganizationMemberStatus
  joinedAt: string | null
  invitation: InternalInvitationResource | null
}

export interface InternalOrganizationDetailResource extends InternalOrganizationListResource {
  owners: InternalOwnerResource[]
}

export interface ProvisionOrganizationInput {
  name: string
  slug?: string
  timezone?: string
  ownerName: string
  ownerEmail: string
}

export interface ProvisionOrganizationResponse {
  organization: InternalOrganizationListResource
  owner: InternalOwnerResource
  invitation: InternalInvitationResource
  delivery: 'sent' | 'failed'
}

export interface AddInternalOwnerInput {
  name: string
  email: string
}

export class InternalOrganizationService {
  constructor(private readonly client: HttpClient) {}

  list(): Promise<ApiResponse<InternalOrganizationListResource[]>> {
    return this.client.get<InternalOrganizationListResource[]>(
      INTERNAL_ORGANIZATIONS_ENDPOINT,
    )
  }

  get(
    organizationId: string,
  ): Promise<ApiResponse<InternalOrganizationDetailResource>> {
    return this.client.get<InternalOrganizationDetailResource>(
      organizationPath(organizationId),
    )
  }

  provision(
    input: ProvisionOrganizationInput,
  ): Promise<ApiResponse<ProvisionOrganizationResponse>> {
    return this.client.post<ProvisionOrganizationResponse>(
      `${INTERNAL_ORGANIZATIONS_ENDPOINT}provision/`,
      input,
    )
  }

  addOwner(
    organizationId: string,
    input: AddInternalOwnerInput,
  ): Promise<ApiResponse<InternalInvitationResource>> {
    return this.client.post<InternalInvitationResource>(
      `${organizationPath(organizationId)}owners/`,
      input,
    )
  }

  resendInvitation(
    invitationId: string,
  ): Promise<ApiResponse<InternalInvitationResource>> {
    return this.client.post<InternalInvitationResource>(
      `${INTERNAL_INVITATIONS_ENDPOINT}${encodeURIComponent(invitationId)}/resend/`,
    )
  }
}

export const internalOrganizationService = new InternalOrganizationService(
  httpClient,
)

function organizationPath(organizationId: string): string {
  return `${INTERNAL_ORGANIZATIONS_ENDPOINT}${encodeURIComponent(organizationId)}/`
}
