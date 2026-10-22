import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import {
  AuthContext,
  type AuthContextValue,
} from '../contexts/authContextDefinition'
import type { ModuleSummary } from '../types/modules'
import HubPage from './HubPage'

function renderHub(
  modules: ModuleSummary[],
  role: 'owner' | 'admin' | 'member' = 'member',
) {
  const activeMembership = {
    id: 'member-1',
    displayName: 'Colaborador',
    role,
    status: 'active',
    organization: {
      id: 'org-1',
      name: 'Escritório',
      slug: 'escritorio',
      timezone: 'America/Sao_Paulo',
    },
    modules,
  }
  const auth: AuthContextValue = {
    activeMembership,
    memberships: [activeMembership],
    session: null,
    user: null,
    isAuthenticated: true,
    isInitializing: false,
    initializationError: null,
    login: async () => {
      throw new Error('not used')
    },
    logout: async () => {},
    selectActiveMembership: async () => {},
    refreshSession: async () => {},
  }
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  try {
    return renderToStaticMarkup(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={auth}>
            <HubPage />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
  } finally {
    queryClient.clear()
  }
}

describe('HubPage module access', () => {
  it('offers Equipe to an owner without any operational module', () => {
    const markup = renderHub([], 'owner')
    expect(markup).toContain('href="/equipe"')
    expect(markup).toContain('Acessar equipe')
    expect(markup).not.toContain('Nenhum módulo disponível')
    expect(markup).not.toContain('href="/processos"')
    expect(markup).not.toContain('href="/"')
  })

  it('shows only Processos to a process-only member', () => {
    const markup = renderHub([
      {
        module: 'processes',
        globalAccess: false,
        actions: ['read'],
        sectors: [
          { id: 'reg', name: 'Regularidade', role: 'reg', actions: ['read'] },
        ],
      },
    ])
    expect(markup).toContain('href="/processos"')
    expect(markup).toContain('Regularidade')
    expect(markup).not.toContain('href="/"')
    expect(markup).not.toContain('href="/configuracoes/modulos"')
  })

  it('does not infer Processos access from the owner role', () => {
    const markup = renderHub(
      [
        {
          module: 'routines',
          globalAccess: true,
          actions: ['read'],
          sectors: [],
        },
      ],
      'owner',
    )
    expect(markup).toContain('href="/"')
    expect(markup).not.toContain('href="/processos"')
    expect(markup).toContain('href="/equipe"')
  })

  it('keeps Equipe unavailable to an admin even with no modules', () => {
    const markup = renderHub([], 'admin')
    expect(markup).toContain('Nenhum módulo disponível')
    expect(markup).not.toContain('href="/configuracoes/modulos"')
    expect(markup).not.toContain('href="/equipe"')
    expect(markup).not.toContain('href="/processos"')
  })
})
