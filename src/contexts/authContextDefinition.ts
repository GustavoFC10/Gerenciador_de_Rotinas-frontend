import { createContext } from 'react'

import type {
  AuthSession,
  LoginCredentials,
  MembershipSummary,
} from '../services/authService'
import type { AppUser } from '../types/domain'

export interface AuthContextValue {
  session: AuthSession | null
  user: AppUser | null
  memberships: MembershipSummary[]
  activeMembership: MembershipSummary | null
  isAuthenticated: boolean
  isInitializing: boolean
  initializationError: Error | null
  login: (credentials: LoginCredentials) => Promise<AuthSession>
  logout: () => Promise<void>
  selectActiveMembership: (membershipId: string) => Promise<void>
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)
