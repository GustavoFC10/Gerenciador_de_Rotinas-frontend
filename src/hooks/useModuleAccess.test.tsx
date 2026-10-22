/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import {
  AuthContext,
  type AuthContextValue,
} from '../contexts/authContextDefinition'
import { queryKeys } from '../query/queryKeys'
import { moduleService } from '../services/moduleService'
import type { ModuleSummary } from '../types/modules'
import { useModuleAccess } from './useModuleAccess'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const full: ModuleSummary = {
  module: 'processes',
  globalAccess: false,
  actions: ['read', 'viewFinancial'],
  sectors: [
    {
      id: 'fin',
      name: 'Financeiro',
      role: 'fin',
      actions: ['read', 'viewFinancial'],
    },
  ],
  executeSectors: ['fin'],
}
const restricted: ModuleSummary = {
  module: 'processes',
  globalAccess: false,
  actions: ['read'],
  sectors: [
    { id: 'reg', name: 'Regularidade', role: 'reg', actions: ['read'] },
  ],
  executeSectors: ['reg'],
}

async function checkCachedData(next: ModuleSummary) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const scope = { organizationId: 'org', membershipId: 'member' }
  const detailKey = [
    ...queryKeys.scope(scope),
    'processes',
    'detail',
    'process-1',
  ]
  client.setQueryData(detailKey, { custo: '123.45' })
  const refreshSession = vi.fn(async () => {})
  const membership = {
    id: 'member',
    displayName: 'Pessoa',
    role: 'member' as const,
    status: 'active',
    organization: {
      id: 'org',
      name: 'Escritório',
      slug: 'escritorio',
      timezone: 'America/Sao_Paulo',
    },
    modules: [full],
  }
  const auth: AuthContextValue = {
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
  const permissions = vi
    .spyOn(moduleService, 'permissions')
    .mockResolvedValue({ modules: [next] })
  function Consumer() {
    const access = useModuleAccess()
    return <span>{access.getModule('processes')?.sectors[0]?.name}</span>
  }
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <AuthContext.Provider value={auth}>
            <Consumer />
          </AuthContext.Provider>
        </QueryClientProvider>,
      )
      await new Promise((resolve) => setTimeout(resolve, 15))
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15))
    })
    return {
      cached: client.getQueryData(detailKey),
      refreshes: refreshSession.mock.calls.length,
      content: host.textContent,
    }
  } finally {
    await act(async () => root.unmount())
    client.clear()
    host.remove()
    permissions.mockRestore()
  }
}

describe('module permission refresh', () => {
  it('clears cached financial resources when module permissions change', async () => {
    const result = await checkCachedData(restricted)
    expect(result.cached).toBeUndefined()
    expect(result.refreshes).toBe(1)
    expect(result.content).toBe('Regularidade')
  })
  it('keeps resources when effective module permissions are unchanged', async () => {
    const result = await checkCachedData(full)
    expect(result.cached).toEqual({ custo: '123.45' })
    expect(result.refreshes).toBe(0)
  })
})
