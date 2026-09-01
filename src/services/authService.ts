import { ApiError, HttpClient, httpClient } from './httpClient'
import type {
  AppUser,
  DepartmentAccessAssignment,
  DepartmentAccessRole,
  OrganizationRole,
} from '../types/domain'

const AUTH_ENDPOINTS = {
  csrf: '/api/v1/auth/csrf/',
  login: '/api/v1/auth/login/',
  logout: '/api/v1/auth/logout/',
  acceptInvitation: '/api/v1/auth/invitations/accept/',
  session: '/api/v1/auth/session/',
  activeMembership: '/api/v1/auth/active-membership/',
  departments: '/api/v1/departments/',
} as const

export interface LoginCredentials {
  email: string
  password: string
}

export interface InvitationAcceptanceCredentials {
  token: string
  password: string
  passwordConfirm: string
}

export interface UserSummary {
  id: string
  email: string
}

export interface OrganizationSummary {
  id: string
  name: string
  slug: string
  timezone: string
}

export interface MembershipSummary {
  id: string
  displayName: string
  role: OrganizationRole
  status: string
  organization: OrganizationSummary
}

export interface AuthSession {
  user: UserSummary
  memberships: MembershipSummary[]
  activeMembership: MembershipSummary | null
}

export interface AuthState {
  session: AuthSession
  departmentAccesses: DepartmentAccessAssignment[]
}

interface CsrfTokenResponse {
  csrfToken: string
}

interface LoginResponse extends AuthSession {
  csrfToken: string
}

interface DepartmentAccessItem {
  id: string
  accessRole: DepartmentAccessRole | null
}

interface PaginatedDepartmentList {
  next: string | null
  results: DepartmentAccessItem[]
}

export class AuthService {
  constructor(private readonly client: HttpClient) {}

  async initialize(): Promise<AuthState | null> {
    await this.refreshCsrfToken()

    try {
      const session = (
        await this.client.get<AuthSession>(AUTH_ENDPOINTS.session)
      ).data
      return await this.hydrateAuthState(session)
    } catch (error) {
      if (isMissingSessionError(error)) return null
      throw error
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthState> {
    await this.refreshCsrfToken()

    const { data } = await this.client.post<LoginResponse>(
      AUTH_ENDPOINTS.login,
      {
        email: credentials.email.trim(),
        password: credentials.password,
      },
    )

    this.client.setCsrfToken(data.csrfToken)
    return await this.hydrateAuthState(toAuthSession(data))
  }

  async acceptInvitation(
    credentials: InvitationAcceptanceCredentials,
  ): Promise<void> {
    await this.ensureCsrfToken()

    await this.client.post<void>(AUTH_ENDPOINTS.acceptInvitation, {
      token: credentials.token,
      password: credentials.password,
      passwordConfirm: credentials.passwordConfirm,
    })
  }

  async logout(): Promise<void> {
    await this.ensureCsrfToken()

    try {
      await this.client.post<void>(AUTH_ENDPOINTS.logout)
    } finally {
      this.client.clearCsrfToken()
    }
  }

  async selectActiveMembership(membershipId: string): Promise<AuthState> {
    await this.ensureCsrfToken()

    const session = (
      await this.client.put<AuthSession>(AUTH_ENDPOINTS.activeMembership, {
        membershipId,
      })
    ).data

    return await this.hydrateAuthState(session)
  }

  async refreshSession(): Promise<AuthState | null> {
    try {
      const session = (
        await this.client.get<AuthSession>(AUTH_ENDPOINTS.session)
      ).data
      return await this.hydrateAuthState(session)
    } catch (error) {
      if (isMissingSessionError(error)) return null
      throw error
    }
  }

  private async ensureCsrfToken(): Promise<void> {
    if (!this.client.getCsrfToken()) {
      await this.refreshCsrfToken()
    }
  }

  private async refreshCsrfToken(): Promise<void> {
    const { data } = await this.client.get<CsrfTokenResponse>(
      AUTH_ENDPOINTS.csrf,
    )
    this.client.setCsrfToken(data.csrfToken)
  }

  private async hydrateAuthState(session: AuthSession): Promise<AuthState> {
    if (session.activeMembership?.role !== 'member') {
      return { session, departmentAccesses: [] }
    }

    const departmentAccesses: DepartmentAccessAssignment[] = []
    let nextPage: string | null = AUTH_ENDPOINTS.departments

    while (nextPage) {
      const response = await this.client.get<PaginatedDepartmentList>(nextPage)
      const page: PaginatedDepartmentList = response.data

      page.results.forEach((department) => {
        if (department.accessRole) {
          departmentAccesses.push({
            departmentId: department.id,
            role: department.accessRole,
          })
        }
      })
      nextPage = page.next
    }

    return { session, departmentAccesses }
  }
}

export const authService = new AuthService(httpClient)

export function createAppUser(authState: AuthState | null): AppUser | null {
  const session = authState?.session
  const membership = session?.activeMembership

  if (!session || !membership) return null

  return {
    id: session.user.id,
    membershipId: membership.id,
    name: membership.displayName,
    email: session.user.email,
    role: membership.role,
    departmentAccesses: authState.departmentAccesses,
    avatarUrl: '',
  }
}

function toAuthSession(response: LoginResponse): AuthSession {
  return {
    user: response.user,
    memberships: response.memberships,
    activeMembership: response.activeMembership,
  }
}

function isMissingSessionError(error: unknown): boolean {
  return error instanceof ApiError && [401, 403].includes(error.status)
}
