/** @vitest-environment happy-dom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import {
  AuthContext,
  type AuthContextValue,
} from './contexts/authContextDefinition'
import { departmentService } from './services/departmentService'
import { moduleService } from './services/moduleService'
import { organizationMemberService } from './services/organizationMemberService'
import * as routineControlService from './services/routineControlService'
import type { ModuleSummary } from './types/modules'

vi.mock('./pages/processes/ProcessesPage', () => ({
  default: () => <main data-processes-module>Processos autorizado</main>,
}))
vi.mock('./pages/EmployeesPage', () => ({
  default: () => <main data-team-module>Equipe independente</main>,
}))
vi.mock('./pages/ProfilePage', () => ({
  default: () => <main>Perfil compartilhado</main>,
}))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement
let root: Root
let queryClient: QueryClient
const processes: ModuleSummary = {
  module: 'processes',
  globalAccess: false,
  actions: ['read'],
  sectors: [
    { id: 'reg', name: 'Regularidade', role: 'reg', actions: ['read'] },
  ],
  executeSectors: ['reg'],
}
const routines: ModuleSummary = {
  module: 'routines',
  globalAccess: true,
  actions: ['read'],
  sectors: [],
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  vi.spyOn(routineControlService, 'getRoutineControl')
  vi.spyOn(departmentService, 'listAll').mockResolvedValue([])
})

afterEach(async () => {
  await act(async () => root.unmount())
  queryClient.clear()
  host.remove()
  vi.restoreAllMocks()
})

async function renderApp(
  path: string,
  modules: ModuleSummary[],
  role: 'owner' | 'admin' | 'member' = 'member',
) {
  vi.spyOn(moduleService, 'permissions').mockResolvedValue({ modules })
  const membership = {
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
    session: {
      user: {
        id: 'user-1',
        email: 'pessoa@example.com',
        isPlatformStaff: false,
      },
      memberships: [membership],
      activeMembership: membership,
    },
    user: null,
    memberships: [membership],
    activeMembership: membership,
    isAuthenticated: true,
    isInitializing: false,
    initializationError: null,
    login: async () => {
      throw new Error('unused')
    },
    logout: async () => {},
    selectActiveMembership: async () => {},
    refreshSession: async () => {},
  }
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={auth}>
            <App />
            <LocationProbe />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
  })
}

function LocationProbe() {
  return <output data-location>{useLocation().pathname}</output>
}

describe('App module routing', () => {
  it('keeps profile and preferences accessible without routine module access', async () => {
    await renderApp('/hub/perfil', [processes])
    expect(host.textContent).toContain('Perfil compartilhado')
    expect(routineControlService.getRoutineControl).not.toHaveBeenCalled()
  })
  it('defaults an authenticated login to the module HUB', async () => {
    await renderApp('/login', [processes])
    expect(host.querySelector('[data-location]')?.textContent).toBe('/hub')
    expect(host.textContent).toContain('Onde vamos trabalhar?')
    expect(routineControlService.getRoutineControl).not.toHaveBeenCalled()
  })

  it('opens Processos directly without fetching routine operational data', async () => {
    await renderApp('/processos', [processes])
    expect(host.querySelector('[data-processes-module]')).not.toBeNull()
    expect(routineControlService.getRoutineControl).not.toHaveBeenCalled()
  })

  it('returns a process-only member from the routines route to the HUB', async () => {
    await renderApp('/', [processes])
    expect(host.querySelector('[data-location]')?.textContent).toBe('/hub')
    expect(routineControlService.getRoutineControl).not.toHaveBeenCalled()
  })

  it('does not grant Processos implicitly to an owner', async () => {
    await renderApp('/processos', [routines], 'owner')
    expect(host.querySelector('[data-location]')?.textContent).toBe('/hub')
    expect(host.querySelector('[data-processes-module]')).toBeNull()
    expect(routineControlService.getRoutineControl).not.toHaveBeenCalled()
  })

  it('opens Equipe for an owner without operational modules', async () => {
    await renderApp('/equipe', [], 'owner')
    for (let i = 0; i < 100 && !host.querySelector('[data-team-module]'); i++)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
    expect(host.querySelector('[data-team-module]')).not.toBeNull()
    expect(routineControlService.getRoutineControl).not.toHaveBeenCalled()
  })
  it.each(['admin', 'member'] as const)(
    'blocks direct Equipe access for %s',
    async (role) => {
      const list = vi
        .spyOn(organizationMemberService, 'listAll')
        .mockResolvedValue([])
      await renderApp('/equipe/novo', [], role)
      expect(host.querySelector('[data-location]')?.textContent).toBe('/hub')
      expect(list).not.toHaveBeenCalled()
      expect(departmentService.listAll).not.toHaveBeenCalled()
    },
  )
  it('redirects legacy access settings into Equipe for an owner', async () => {
    vi.spyOn(organizationMemberService, 'listAll').mockResolvedValue([])
    await renderApp('/configuracoes/modulos?member=selected', [], 'owner')
    expect(host.querySelector('[data-location]')?.textContent).toBe(
      '/equipe/acessos',
    )
    expect(routineControlService.getRoutineControl).not.toHaveBeenCalled()
  })
  it('does not expose legacy settings to an admin', async () => {
    await renderApp('/configuracoes/modulos', [], 'admin')
    expect(host.querySelector('[data-location]')?.textContent).toBe('/hub')
  })
})
