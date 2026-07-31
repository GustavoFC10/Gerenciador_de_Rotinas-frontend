import { createContext } from 'react'

import type { LoginCredentials } from '../services/authService'
import type { AppUser } from '../types/domain'

export interface AuthContextValue {
  user: AppUser | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)
