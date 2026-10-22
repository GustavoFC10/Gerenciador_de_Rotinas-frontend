/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CreateEmployeePage from './CreateEmployeePage'
import EmployeeProfilePanel from '../components/forms/EmployeeProfilePanel'
import {
  organizationMemberService,
  type OrganizationMemberResource,
} from '../services/organizationMemberService'
import type { MembershipInvitationInput } from '../services/organizationMemberService'

vi.mock('../hooks/useAppState', () => ({
  useAppState: () => ({ user: { role: 'owner' } }),
}))
vi.mock('../components/files/ImageEditor', () => ({ default: () => null }))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let host: HTMLDivElement
let root: Root
let client: QueryClient
const departments = [{ id: 'fiscal', name: 'Fiscal' }]
const member: OrganizationMemberResource = {
  id: 'member-1',
  displayName: 'Maria',
  email: 'maria@example.com',
  role: 'admin',
  status: 'pending',
  joinedAt: null,
  departmentAccesses: [],
  createdAt: '2026-10-01T12:00:00Z',
  updatedAt: '2026-10-20T12:00:00Z',
  moduleAccesses: [
    { module: 'routines', enabled: false },
    {
      module: 'processes',
      enabled: true,
      sectors: [
        { sector: 'fin', role: 'fin', jobTitle: 'Analista financeiro' },
        { sector: 'reg', role: 'reg', jobTitle: 'Apoio' },
      ],
    },
  ],
}
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.restoreAllMocks()
})
async function render(element: React.ReactNode) {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>{element}</MemoryRouter>
      </QueryClientProvider>,
    )
  })
}
async function change(id: string, value: string) {
  await act(async () => {
    const field = document.getElementById(id) as
      HTMLSelectElement | HTMLInputElement
    if (!field) throw new Error('Missing field: ' + id)
    if (field instanceof HTMLInputElement)
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )!.set!.call(field, value)
    else field.value = value
    field.dispatchEvent(
      new Event(field instanceof HTMLSelectElement ? 'change' : 'input', {
        bubbles: true,
      }),
    )
  })
}
async function submit() {
  await act(async () => {
    document
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
const response = (data: OrganizationMemberResource) => ({
  data,
  status: 200,
  etag: null,
  requestId: null,
  headers: new Headers(),
})

describe('general collaborator profiles', () => {
  it('includes Processos configuration and optional titles in the initial invitation', async () => {
    const invite = vi.fn(async (input: MembershipInvitationInput) => ({
      ...input,
      id: 'invitation',
      memberId: 'member-2',
      expiresAt: '2026-10-30T12:00:00Z',
      createdAt: '',
    }))
    await render(
      <CreateEmployeePage
        departments={departments}
        onInvite={invite}
        onCancel={() => {}}
      />,
    )
    await change('employee-name', 'Nova pessoa')
    await change('employee-email', 'nova@example.com')
    await change('member-module-processes', 'sectors')
    await change('member-sector-processes-fin', 'fin')
    await change('member-title-fin', 'Analista')
    await submit()
    expect(invite).toHaveBeenCalledWith({
      displayName: 'Nova pessoa',
      email: 'nova@example.com',
      role: 'member',
      moduleAccesses: [
        { module: 'routines', enabled: false },
        {
          module: 'processes',
          enabled: true,
          sectors: [{ sector: 'fin', role: 'fin', jobTitle: 'Analista' }],
        },
      ],
    })
    expect(host.textContent).toContain('Convite enviado')
  })
  it('shows existing sector titles and saves profile, role, and replacement grants in one request', async () => {
    const update = vi
      .spyOn(organizationMemberService, 'update')
      .mockResolvedValue(response(member))
    const onChange = vi.fn(async () => {})
    await render(
      <EmployeeProfilePanel
        member={member}
        departments={departments}
        canManage
        canAssignOwner
        onMemberChange={onChange}
        onClose={() => {}}
      />,
    )
    expect(
      (document.getElementById('member-title-fin') as HTMLInputElement).value,
    ).toBe('Analista financeiro')
    expect(document.body.textContent).toContain('maria@example.com')
    await change('employee-profile-name', 'Maria Silva')
    await change('employee-profile-role', 'member')
    await change('member-sector-processes-fin', '')
    await change('member-module-routines', 'departments')
    await change('member-sector-routines-fiscal', 'viewer')
    await submit()
    expect(update).toHaveBeenCalledExactlyOnceWith('member-1', {
      displayName: 'Maria Silva',
      role: 'member',
      moduleAccesses: [
        {
          module: 'processes',
          enabled: true,
          sectors: [{ sector: 'reg', role: 'reg', jobTitle: 'Apoio' }],
        },
        {
          module: 'routines',
          enabled: true,
          role: 'departments',
          sectors: [{ sector: 'fiscal', role: 'viewer' }],
        },
      ],
    })
    expect(onChange).toHaveBeenCalledWith(member)
  })
  it('can revoke both modules independently of an organizational administrator role', async () => {
    const update = vi
      .spyOn(organizationMemberService, 'update')
      .mockResolvedValue(response(member))
    await render(
      <EmployeeProfilePanel
        member={member}
        departments={departments}
        canManage
        canAssignOwner
        onMemberChange={async () => {}}
        onClose={() => {}}
      />,
    )
    await change('member-module-processes', 'none')
    await submit()
    expect(update).toHaveBeenCalledWith('member-1', {
      displayName: 'Maria',
      moduleAccesses: [
        { module: 'routines', enabled: false },
        { module: 'processes', enabled: false },
      ],
    })
  })
  it('keeps drafts after a failed atomic save', async () => {
    vi.spyOn(organizationMemberService, 'update').mockRejectedValue(
      new Error('Departamento indisponível.'),
    )
    await render(
      <EmployeeProfilePanel
        member={member}
        departments={departments}
        canManage
        canAssignOwner
        onMemberChange={async () => {}}
        onClose={() => {}}
      />,
    )
    await change('employee-profile-name', 'Maria Silva')
    await submit()
    expect(document.body.textContent).toContain('Departamento indisponível.')
    expect(
      (document.getElementById('employee-profile-name') as HTMLInputElement)
        .value,
    ).toBe('Maria Silva')
  })
  it('prevents an administrator from modifying an owner', async () => {
    const update = vi.spyOn(organizationMemberService, 'update')
    await render(
      <EmployeeProfilePanel
        member={{ ...member, role: 'owner' }}
        departments={departments}
        canManage
        canAssignOwner={false}
        onMemberChange={async () => {}}
        onClose={() => {}}
      />,
    )
    expect(
      (document.getElementById('employee-profile-name') as HTMLInputElement)
        .disabled,
    ).toBe(true)
    expect(
      (document.getElementById('member-module-processes') as HTMLSelectElement)
        .disabled,
    ).toBe(true)
    await submit()
    expect(update).not.toHaveBeenCalled()
  })
})
