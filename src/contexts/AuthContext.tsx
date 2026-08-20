import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  authService,
  createAppUser,
  type AuthState,
  type LoginCredentials,
} from '../services/authService'
import { AuthContext } from './authContextDefinition'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [initializationError, setInitializationError] = useState<Error | null>(
    null,
  )

  const initialize = useCallback(async () => {
    setIsInitializing(true)
    setInitializationError(null)

    try {
      setAuthState(await authService.initialize())
    } catch (error) {
      setAuthState(null)
      setInitializationError(toError(error))
    } finally {
      setIsInitializing(false)
    }
  }, [])

  useEffect(() => {
    void initialize()
  }, [initialize])

  const login = useCallback(async (credentials: LoginCredentials) => {
    setInitializationError(null)
    const nextAuthState = await authService.login(credentials)
    setAuthState(nextAuthState)
    return nextAuthState.session
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setAuthState(null)
  }, [])

  const selectActiveMembership = useCallback(async (membershipId: string) => {
    setAuthState(await authService.selectActiveMembership(membershipId))
  }, [])

  const refreshSession = useCallback(async () => {
    setAuthState(await authService.refreshSession())
  }, [])

  const session = authState?.session ?? null
  const user = useMemo(() => createAppUser(authState), [authState])
  const value = useMemo(
    () => ({
      session,
      user,
      memberships: session?.memberships ?? [],
      activeMembership: session?.activeMembership ?? null,
      isAuthenticated: Boolean(session),
      isInitializing,
      initializationError,
      login,
      logout,
      selectActiveMembership,
      refreshSession,
    }),
    [
      initializationError,
      isInitializing,
      login,
      logout,
      refreshSession,
      selectActiveMembership,
      session,
      user,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function toError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error('Não foi possível restaurar a sessão.')
}
