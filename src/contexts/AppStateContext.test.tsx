import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { managerUserMock } from '../constants/roles'
import { useAppState } from '../hooks/useAppState'
import { AuthContext } from './authContextDefinition'
import type { AuthContextValue } from './authContextDefinition'
import { AppStateProvider } from './AppStateContext'

describe('AppStateProvider authenticated user', () => {
  it('exposes the exact user from AuthContext', () => {
    const markup = renderToStaticMarkup(
      <AuthContext.Provider value={buildAuthValue(managerUserMock)}>
        <AppStateProvider>
          <UserProbe />
        </AppStateProvider>
      </AuthContext.Provider>,
    )

    expect(markup).toContain('Carla Melo')
    expect(markup).toContain('manager')
  })

  it('does not invent an application user before authentication', () => {
    const markup = renderToStaticMarkup(
      <AuthContext.Provider value={buildAuthValue(null)}>
        <AppStateProvider>
          <p data-public>Área pública</p>
        </AppStateProvider>
      </AuthContext.Provider>,
    )

    expect(markup).toContain('Área pública')
    expect(markup).not.toContain('Ana Souza')
  })
})

function UserProbe() {
  const { user } = useAppState()
  return <p>{`${user.name}:${user.role}`}</p>
}

function buildAuthValue(user: AuthContextValue['user']): AuthContextValue {
  return {
    user,
    isAuthenticated: Boolean(user),
    login: async () => undefined,
    logout: () => undefined,
  }
}
