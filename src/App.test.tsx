/** @vitest-environment happy-dom */

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { ROUTES } from './constants/routes'
import { AuthContext } from './contexts/authContextDefinition'
import type { AuthContextValue } from './contexts/authContextDefinition'
import { internalOrganizationService } from './services/internalOrganizationService'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

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

  it('redirects a staff account without an organization to the internal area', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    document.body.appendChild(host)
    const listOrganizations = vi
      .spyOn(internalOrganizationService, 'list')
      .mockResolvedValue({
        data: [],
        status: 200,
        etag: null,
        requestId: null,
        headers: new Headers(),
      })

    try {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={[ROUTES.HOME]}>
            <QueryClientProvider client={queryClient}>
              <AuthContext.Provider value={internalAuthValue}>
                <App />
                <LocationProbe />
              </AuthContext.Provider>
            </QueryClientProvider>
          </MemoryRouter>,
        )
      })

      expect(host.querySelector('[data-location]')?.textContent).toBe(
        ROUTES.INTERNAL_ORGANIZATIONS,
      )
      expect(host.textContent).not.toContain('Escolha onde deseja trabalhar')
    } finally {
      await act(async () => {
        root.unmount()
      })
      queryClient.clear()
      listOrganizations.mockRestore()
      host.remove()
    }
  })
})

function LocationProbe() {
  const location = useLocation()

  return <output data-location>{location.pathname}</output>
}

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
