/** @vitest-environment happy-dom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { ROUTES } from './constants/routes'
import { AuthContext } from './contexts/authContextDefinition'
import type { AuthContextValue } from './contexts/authContextDefinition'
import { authService } from './services/authService'
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
      <MemoryRouter
        initialEntries={[window.location.pathname + window.location.hash]}
      >
        <AuthContext.Provider value={authValue}>
          <App />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(markup).toContain('Defina sua senha')
    expect(markup).toContain('name="password"')
    expect(markup).toContain('name="passwordConfirm"')
    expect(markup).not.toContain('name="email"')
    expect(markup).toContain('Já tenho uma conta')
  })

  describe('invitation acceptance', () => {
    let host: HTMLDivElement
    let root: Root

    beforeEach(() => {
      host = document.createElement('div')
      document.body.appendChild(host)
      root = createRoot(host)
    })

    afterEach(async () => {
      await act(async () => root.unmount())
      host.remove()
      vi.restoreAllMocks()
    })

    async function renderInvitation(path = ROUTES.ACCEPT_INVITATION as string) {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={[`${path}#token=invitation-token`]}>
            <AuthContext.Provider value={authValue}>
              <App />
              <LocationProbe />
            </AuthContext.Provider>
          </MemoryRouter>,
        )
      })
    }

    async function changeField(name: string, value: string) {
      await act(async () => {
        const input = host.querySelector<HTMLInputElement>(`[name="${name}"]`)!
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )!.set!.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }

    async function clickButton(label: string) {
      await act(async () => {
        const button = Array.from(host.querySelectorAll('button')).find(
          (element) => element.textContent === label,
        )!
        button.click()
      })
    }

    async function submitInvitation() {
      await act(async () => {
        host
          .querySelector('form')!
          .dispatchEvent(
            new Event('submit', { bubbles: true, cancelable: true }),
          )
      })
    }

    it('preserves the token between screens and submits the existing password in both fields', async () => {
      const acceptInvitation = vi
        .spyOn(authService, 'acceptInvitation')
        .mockResolvedValue(undefined)
      await renderInvitation()
      await changeField('password', 'draft-password')
      await clickButton('Já tenho uma conta')

      expect(host.querySelector('[data-location]')?.textContent).toBe(
        `${ROUTES.ACCEPT_INVITATION_EXISTING_ACCOUNT}#token=invitation-token`,
      )
      expect(host.querySelectorAll('input[type="password"]')).toHaveLength(1)
      expect(
        host.querySelector<HTMLInputElement>('[name="password"]')?.value,
      ).toBe('')
      expect(
        host.querySelector('[name="password"]')?.getAttribute('autocomplete'),
      ).toBe('current-password')

      await clickButton('Ainda não tenho uma conta')
      expect(host.querySelector('[name="passwordConfirm"]')).not.toBeNull()
      expect(host.querySelector('[data-location]')?.textContent).toBe(
        `${ROUTES.ACCEPT_INVITATION}#token=invitation-token`,
      )
      await clickButton('Já tenho uma conta')
      await submitInvitation()
      expect(host.querySelector('[role="alert"]')?.textContent).toBe(
        'Informe sua senha atual.',
      )
      expect(acceptInvitation).not.toHaveBeenCalled()

      await changeField('password', 'current-password')
      await submitInvitation()

      expect(acceptInvitation).toHaveBeenCalledExactlyOnceWith({
        token: 'invitation-token',
        password: 'current-password',
        passwordConfirm: 'current-password',
      })
      expect(host.textContent).toContain('Convite aceito')
      expect(host.textContent).toContain(
        'Entre com seu e-mail e sua senha atual.',
      )
      expect(host.querySelector('[data-location]')?.textContent).toBe(
        ROUTES.ACCEPT_INVITATION_EXISTING_ACCOUNT,
      )
      expect(host.querySelector('input[type="password"]')).toBeNull()
    })

    it('still requires matching passwords when creating an account', async () => {
      const acceptInvitation = vi
        .spyOn(authService, 'acceptInvitation')
        .mockResolvedValue(undefined)
      await renderInvitation()
      await changeField('password', 'new-password')
      await changeField('passwordConfirm', 'different-password')
      await submitInvitation()

      expect(acceptInvitation).not.toHaveBeenCalled()
      expect(host.querySelector('[role="alert"]')?.textContent).toBe(
        'As senhas informadas não coincidem.',
      )

      await changeField('passwordConfirm', 'new-password')
      await submitInvitation()

      expect(acceptInvitation).toHaveBeenCalledExactlyOnceWith({
        token: 'invitation-token',
        password: 'new-password',
        passwordConfirm: 'new-password',
      })
      expect(host.textContent).toContain('Convite aceito')
      expect(host.querySelector('[data-location]')?.textContent).toBe(
        ROUTES.ACCEPT_INVITATION,
      )
    })

    it('allows retrying an existing-account invitation after an API error', async () => {
      const acceptInvitation = vi
        .spyOn(authService, 'acceptInvitation')
        .mockRejectedValueOnce(new Error('Senha incorreta.'))
        .mockResolvedValueOnce(undefined)
      await renderInvitation(ROUTES.ACCEPT_INVITATION_EXISTING_ACCOUNT)
      await changeField('password', 'wrong-password')
      await submitInvitation()

      expect(host.querySelector('[role="alert"]')?.textContent).toBe(
        'Senha incorreta.',
      )
      expect(host.querySelector('[data-location]')?.textContent).toContain(
        '#token=invitation-token',
      )

      await changeField('password', 'correct-password')
      await submitInvitation()

      expect(acceptInvitation).toHaveBeenLastCalledWith({
        token: 'invitation-token',
        password: 'correct-password',
        passwordConfirm: 'correct-password',
      })
      expect(host.textContent).toContain('Convite aceito')
    })

    it.each([
      ROUTES.ACCEPT_INVITATION,
      ROUTES.ACCEPT_INVITATION_EXISTING_ACCOUNT,
    ])(
      'rejects missing tokens at %s before authentication initializes',
      (path) => {
        const markup = renderToStaticMarkup(
          <MemoryRouter initialEntries={[path]}>
            <AuthContext.Provider value={authValue}>
              <App />
            </AuthContext.Provider>
          </MemoryRouter>,
        )

        expect(markup).toContain(
          'O link de convite não contém um token válido.',
        )
        expect(markup).not.toContain('<form')
      },
    )
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

  return (
    <output data-location>
      {location.pathname}
      {location.hash}
    </output>
  )
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
