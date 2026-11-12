/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AuthContext,
  type AuthContextValue,
} from '../../contexts/authContextDefinition'
import { honorariosService } from '../../services/honorariosService'
import { ApiError } from '../../services/httpClient'
import { queryKeys } from '../../query/queryKeys'
import type {
  HonorariosConfiguration,
  HonorariosParams,
} from '../../types/honorarios'
import paramsJson from '../../../docs/honorarios_base/config-params.json'
import HonorariosPage from './HonorariosPage'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement, root: Root, client: QueryClient
const refreshSession = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

function configuration(name: string): HonorariosConfiguration {
  return {
    version: 1,
    params: structuredClone(paramsJson) as HonorariosParams,
    office: {
      nome: name,
      crc: '',
      cidade: '',
      telefone: '',
      email: '',
      site: '',
      logo: '',
      validadeDias: 15,
      condicoes: '',
      escopoExtra: '',
      units: [],
    },
    permissions: {
      read: true,
      edit: true,
      applyAdjustment: true,
      manage: true,
    },
  }
}
function auth(tenant: string): AuthContextValue {
  const membership: NonNullable<AuthContextValue['activeMembership']> = {
    id: `member-${tenant}`,
    displayName: 'Usuário',
    role: 'owner',
    status: 'active',
    organization: {
      id: `org-${tenant}`,
      name: `Organização ${tenant}`,
      slug: tenant,
      timezone: 'America/Sao_Paulo',
    },
    modules: [
      {
        module: 'honorarios',
        role: 'manager',
        globalAccess: false,
        sectors: [],
        actions: ['read', 'edit', 'applyAdjustment', 'manage'],
      },
    ],
  }
  return {
    activeMembership: membership,
    memberships: [membership],
    session: null,
    user: null,
    isAuthenticated: true,
    isInitializing: false,
    initializationError: null,
    login: vi.fn(),
    logout: vi.fn(),
    selectActiveMembership: vi.fn(),
    refreshSession,
  }
}
const scope = (tenant: string) => [
  ...queryKeys.scope({
    organizationId: `org-${tenant}`,
    membershipId: `member-${tenant}`,
  }),
  'honorarios',
]
const forbidden = () =>
  new ApiError({
    problem: { type: 'forbidden', title: 'Acesso revogado', status: 403 },
    requestId: 'denied',
    response: new Response(null, { status: 403 }),
  })

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  refreshSession.mockClear()
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.restoreAllMocks()
})
async function render(tenant: string) {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={['/honorarios/parametros']}>
        <QueryClientProvider client={client}>
          <AuthContext.Provider value={auth(tenant)}>
            <Routes>
              <Route path="/honorarios/*" element={<HonorariosPage />} />
            </Routes>
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    ),
  )
}
async function waitFor(check: () => boolean) {
  const deadline = Date.now() + 2000
  while (!check()) {
    if (Date.now() > deadline)
      throw new Error(`Estado não alcançado: ${host.textContent}`)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
}
function officeName() {
  return [...host.querySelectorAll('label')]
    .find((label) => label.textContent?.includes('Nome do escritório'))
    ?.querySelector('input')
}

describe('Honorários workspace isolation', () => {
  it('removes financial screens and cached records when an active module request returns 403', async () => {
    const getConfiguration = vi
      .spyOn(honorariosService, 'configuration')
      .mockResolvedValue(configuration('Escritório confidencial A'))
    await render('a')
    await waitFor(() => officeName()?.value === 'Escritório confidencial A')
    client.setQueryData([...scope('a'), 'private-record'], {
      currentFee: '1200.00',
    })
    getConfiguration.mockRejectedValueOnce(forbidden())
    await act(async () => {
      await client.invalidateQueries({
        queryKey: [...scope('a'), 'configuration'],
      })
    })
    await waitFor(
      () =>
        host.textContent?.includes('Seu acesso a Honorários foi revogado.') ??
        false,
    )
    expect(officeName()).toBeUndefined()
    expect(host.querySelector('form')).toBeNull()
    expect(
      client
        .getQueriesData({ queryKey: scope('a') })
        .some(([, data]) => data !== undefined),
    ).toBe(false)
    expect(refreshSession).toHaveBeenCalled()
  })

  it('clears the prior tenant draft and loads an independently scoped configuration after switching organizations', async () => {
    let resolveB!: (value: HonorariosConfiguration) => void
    const pendingB = new Promise<HonorariosConfiguration>((resolve) => {
      resolveB = resolve
    })
    const getConfiguration = vi
      .spyOn(honorariosService, 'configuration')
      .mockResolvedValueOnce(configuration('Escritório A'))
      .mockImplementationOnce(() => pendingB)
    await render('a')
    await waitFor(() => officeName()?.value === 'Escritório A')
    await act(async () => {
      const input = officeName()!
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!.call(input, 'Rascunho financeiro secreto A')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(officeName()?.value).toBe('Rascunho financeiro secreto A')
    await render('b')
    expect(officeName()).toBeUndefined()
    expect(host.textContent).not.toContain('Rascunho financeiro secreto A')
    await act(async () => resolveB(configuration('Escritório B')))
    await waitFor(() => officeName()?.value === 'Escritório B')
    expect(getConfiguration).toHaveBeenCalledTimes(2)
    expect(
      client.getQueryData<HonorariosConfiguration>([
        ...scope('a'),
        'configuration',
      ])?.office.nome,
    ).toBe('Escritório A')
    expect(
      client.getQueryData<HonorariosConfiguration>([
        ...scope('b'),
        'configuration',
      ])?.office.nome,
    ).toBe('Escritório B')
    // A late failure tied to the old tenant cannot revoke the new tenant's workspace.
    await act(async () => {
      await client
        .fetchQuery({
          queryKey: [...scope('a'), 'late-history'],
          queryFn: async () => {
            throw forbidden()
          },
        })
        .catch(() => undefined)
    })
    expect(officeName()?.value).toBe('Escritório B')
    expect(host.textContent).not.toContain(
      'Seu acesso a Honorários foi revogado.',
    )
  })
})
