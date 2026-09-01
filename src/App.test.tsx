/** @vitest-environment happy-dom */

import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import App from './App'
import { ROUTES } from './constants/routes'
import { AuthContext } from './contexts/authContextDefinition'
import type { AuthContextValue } from './contexts/authContextDefinition'

const authValue: AuthContextValue = {
  session: null,
  user: null,
  memberships: [],
  activeMembership: null,
  isAuthenticated: false,
  isInitializing: true,
  initializationError: null,
  login: async () => {
    throw new Error('Not implemented in this test.')
  },
  logout: async () => undefined,
  selectActiveMembership: async () => undefined,
  refreshSession: async () => undefined,
}

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('App', () => {
  it('renders the invitation acceptance form before the authentication redirect', () => {
    window.history.replaceState(
      null,
      '',
      `${ROUTES.ACCEPT_INVITATION}#token=token-from-fragment`,
    )

    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={[ROUTES.ACCEPT_INVITATION]}>
        <AuthContext.Provider value={authValue}>
          <App />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(markup).toContain('Defina ou confirme sua senha')
    expect(markup).toContain('name="password"')
    expect(markup).toContain('name="passwordConfirm"')
    expect(markup).not.toContain('name="email"')
  })
})
