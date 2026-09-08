/** @vitest-environment happy-dom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ROUTES } from '../constants/routes'
import { AuthContext } from '../contexts/authContextDefinition'
import type { AuthContextValue } from '../contexts/authContextDefinition'
import type { ApiResponse } from '../services/httpClient'
import {
  internalOrganizationService,
  type InternalOrganizationListResource,
} from '../services/internalOrganizationService'
import InternalAdminRoutes from './InternalAdminRoutes'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement
let root: Root
let queryClient: QueryClient

const organizations: InternalOrganizationListResource[] = [
  {
    id: 'organization-1',
    name: 'Organizacao Teste',
    slug: 'organizacao-teste',
    timezone: 'America/Sao_Paulo',
    status: 'active',
    memberCount: 3,
    departmentCount: 2,
    createdAt: '2026-09-02T12:00:00.000Z',
  },
]

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  vi.spyOn(internalOrganizationService, 'list').mockResolvedValue(
    apiResponse(organizations),
  )
})

afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  queryClient.clear()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('InternalAdminRoutes', () => {
  it('renders the internal shell and organizations fetched from the API', async () => {
    await renderRoutes(ROUTES.INTERNAL_ORGANIZATIONS)

    expect(host.textContent).toContain('Organizacoes provisionadas')
    expect(host.textContent).toContain('Organizacao Teste')
    expect(currentPath()).toBe(ROUTES.INTERNAL_ORGANIZATIONS)
  })

  it('redirects the internal index route to the organizations list', async () => {
    await renderRoutes(ROUTES.INTERNAL)

    expect(currentPath()).toBe(ROUTES.INTERNAL_ORGANIZATIONS)
    expect(host.textContent).toContain('Organizacoes provisionadas')
  })

  it('redirects an unknown internal route to the organizations list', async () => {
    await renderRoutes('/internal/unknown-route')

    expect(currentPath()).toBe(ROUTES.INTERNAL_ORGANIZATIONS)
    expect(host.textContent).toContain('Organizacoes provisionadas')
  })
})

async function renderRoutes(initialEntry: string) {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={staffAuthValue}>
            <InternalAdminRoutes />
            <LocationProbe />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
  })

  await act(async () => {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 0)
    })
  })
}

const staffAuthValue: AuthContextValue = {
  session: {
    user: {
      id: 'staff-user',
      email: 'staff@example.com',
      isPlatformStaff: true,
    },
    memberships: [],
    activeMembership: null,
  },
  user: null,
  memberships: [],
  activeMembership: null,
  isAuthenticated: true,
  isInitializing: false,
  initializationError: null,
  login: async () => {
    throw new Error('Not implemented in this test.')
  },
  logout: async () => undefined,
  selectActiveMembership: async () => undefined,
  refreshSession: async () => undefined,
}

function LocationProbe() {
  const location = useLocation()

  return <output data-location>{location.pathname}</output>
}

function currentPath(): string | null {
  return host.querySelector('[data-location]')?.textContent ?? null
}

function apiResponse<T>(data: T): ApiResponse<T> {
  return {
    data,
    status: 200,
    etag: null,
    requestId: null,
    headers: new Headers(),
  }
}
