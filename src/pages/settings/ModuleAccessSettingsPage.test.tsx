/** @vitest-environment happy-dom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AuthContext,
  type AuthContextValue,
} from '../../contexts/authContextDefinition'
import { moduleService } from '../../services/moduleService'
import { departmentService } from '../../services/departmentService'
import {
  organizationMemberService,
  type OrganizationMemberResource,
} from '../../services/organizationMemberService'
import ModuleAccessSettingsPage from './ModuleAccessSettingsPage'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const member: OrganizationMemberResource = {
  id: 'selected-member',
  displayName: 'Maria',
  email: 'maria@example.com',
  role: 'member',
  status: 'pending',
  joinedAt: null,
  departmentAccesses: [],
  createdAt: '',
  updatedAt: '',
}
let host: HTMLDivElement
let root: Root
let queryClient: QueryClient

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  vi.spyOn(moduleService, 'accesses').mockResolvedValue([])
  vi.spyOn(departmentService, 'listAll').mockResolvedValue([])
})

afterEach(async () => {
  await act(async () => root.unmount())
  queryClient.clear()
  host.remove()
  vi.restoreAllMocks()
})

async function renderMember(
  target: OrganizationMemberResource,
  role: 'admin' | 'owner' = 'owner',
) {
  vi.spyOn(organizationMemberService, 'listAll').mockResolvedValue([target])
  const activeMembership = {
    id: 'viewer-member',
    displayName: 'Administrador',
    role,
    status: 'active',
    organization: {
      id: 'organization-1',
      name: 'Escritório',
      slug: 'escritorio',
      timezone: 'America/Sao_Paulo',
    },
    modules: [],
  }
  const auth: AuthContextValue = {
    session: null,
    user: null,
    memberships: [activeMembership],
    activeMembership,
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
      <MemoryRouter
        initialEntries={[`/configuracoes/modulos?member=${target.id}`]}
      >
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={auth}>
            <ModuleAccessSettingsPage />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  if (role !== 'owner') return
  for (
    let attempt = 0;
    attempt < 100 && !host.querySelector('#member-module-processes');
    attempt += 1
  ) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
  expect(host.querySelector('#member-module-processes')).not.toBeNull()
}

describe('ModuleAccessSettingsPage', () => {
  it('saves independent module access atomically for a pending member', async () => {
    const update = vi
      .spyOn(organizationMemberService, 'update')
      .mockResolvedValue({
        data: member,
        status: 200,
        etag: null,
        requestId: null,
        headers: new Headers(),
      })
    await renderMember(member)
    await act(async () => {
      const moduleSelect = host.querySelector<HTMLSelectElement>(
        '#member-module-processes',
      )!
      moduleSelect.value = 'sectors'
      moduleSelect.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => {
      const sectorSelect = host.querySelector<HTMLSelectElement>(
        '#member-sector-processes-reg',
      )!
      sectorSelect.value = 'reg'
      sectorSelect.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => {
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(update).toHaveBeenCalledWith('selected-member', {
      moduleAccesses: [
        { module: 'routines', enabled: false },
        {
          module: 'processes',
          enabled: true,
          sectors: [{ sector: 'reg', role: 'reg', jobTitle: '' }],
        },
      ],
    })
    expect(host.textContent).toContain('Acessos atualizados.')
  })

  it('does not submit an enabled module without a sector', async () => {
    const update = vi.spyOn(organizationMemberService, 'update')
    await renderMember(member)
    await act(async () => {
      const select = host.querySelector<HTMLSelectElement>(
        '#member-module-processes',
      )!
      select.value = 'sectors'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => {
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(update).not.toHaveBeenCalled()
    expect(host.textContent).toContain(
      'Selecione ao menos um setor em Processos',
    )
  })

  it('keeps owner access controls disabled for an admin', async () => {
    await renderMember({ ...member, role: 'owner', status: 'active' }, 'admin')
    expect(host.textContent).toContain('Somente o proprietário pode configurar')
    expect(host.querySelector('#member-module-processes')).toBeNull()
  })

  it('keeps inactive memberships read only', async () => {
    await renderMember({ ...member, status: 'inactive' }, 'owner')
    expect(host.textContent).toContain(
      'colaboradores ativos ou com convite pendente',
    )
    expect(
      host.querySelector('#member-module-processes')?.matches(':disabled'),
    ).toBe(true)
  })
})
