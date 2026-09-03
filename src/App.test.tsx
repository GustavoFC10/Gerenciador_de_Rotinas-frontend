/** @vitest-environment happy-dom */

import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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

  it('renders the internal skeleton before requiring an active membership', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={[ROUTES.INTERNAL_ORGANIZATIONS]}>
        <QueryClientProvider client={internalQueryClient}>
          <AuthContext.Provider value={internalAuthValue}>
            <App />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    )

    expect(markup).toContain('id="internal-main-content"')
    expect(markup).toContain('>INTERNO<')
    expect(markup).not.toContain('Escolha onde deseja trabalhar')
  })

  it('blocks the internal area for an authenticated non-staff user', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={[ROUTES.INTERNAL_ORGANIZATIONS]}>
        <QueryClientProvider client={internalQueryClient}>
          <AuthContext.Provider value={nonStaffInternalAuthValue}>
            <App />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    )

    expect(markup).toContain('Acesso restrito')
    expect(markup).not.toContain('id="internal-main-content"')
  })
})

const internalAuthValue: AuthContextValue = {
  ...authValue,
  session: {
    user: {
      id: 'internal-user',
      email: 'time@plataforma.test',
      isPlatformStaff: true,
    },
    memberships: [],
    activeMembership: null,
  },
  isAuthenticated: true,
  isInitializing: false,
}

const internalQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

const nonStaffInternalAuthValue: AuthContextValue = {
  ...internalAuthValue,
  session: {
    ...internalAuthValue.session!,
    user: {
      ...internalAuthValue.session!.user,
      isPlatformStaff: false,
    },
  },
}
