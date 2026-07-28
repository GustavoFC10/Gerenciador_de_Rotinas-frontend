import { useMemo, useState, type ReactNode } from 'react'

import {
  clearMockSession,
  loginWithMock,
  persistMockSession,
  readMockSession,
  type LoginCredentials,
} from '../services/authService'
import { AuthContext } from './authContextDefinition'
import type { AppUser } from '../types/domain'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() =>
    readMockSession(window.localStorage)?.user ?? null,
  )

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login: async (credentials: LoginCredentials) => {
        const session = await loginWithMock(credentials)
        persistMockSession(window.localStorage, session)
        setUser(session.user)
      },
      logout: () => {
        clearMockSession(window.localStorage)
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
