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
  type MembershipInvitationResource,
  type OrganizationMemberResource,
  type MembershipInvitationInput,
} from '../services/organizationMemberService'
vi.mock('../hooks/useAppState', () => ({
  useAppState: () => ({ user: { role: 'owner' } }),
}))
vi.mock('../components/files/ImageEditor', () => ({ default: () => null }))
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
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
const response = (data: OrganizationMemberResource) => ({
  data,
  status: 200,
  etag: null,
  requestId: null,
  headers: new Headers(),
})
let host: HTMLDivElement, root: Root, client: QueryClient
beforeEach(() => {
  window.confirm = vi.fn(() => true)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.restoreAllMocks()
})
async function render(element: React.ReactNode) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>{element}</MemoryRouter>
      </QueryClientProvider>,
    ),
  )
}
async function click(text: string) {
  await act(async () => {
    const item = [
      ...document.body.querySelectorAll<HTMLButtonElement>('button'),
    ].find((button) => button.textContent?.trim() === text)
    if (!item) throw new Error('Missing button ' + text)
    item.click()
  })
}
async function change(id: string, value: string) {
  await act(async () => {
    const field = document.getElementById(id) as
      HTMLInputElement | HTMLSelectElement
    if (!field) throw new Error('Missing field ' + id)
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
async function check(id: string) {
  await act(async () => {
    const field = document.getElementById(id) as HTMLInputElement
    if (!field) throw new Error('Missing checkbox ' + id)
    field.click()
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
async function profile(
  target = member,
  canAssignOwner = true,
  onClose = vi.fn(),
  onMemberChange = vi.fn(async () => {}),
) {
  await render(
    <EmployeeProfilePanel
      member={target}
      departments={departments}
      canManage
      canAssignOwner={canAssignOwner}
      onMemberChange={onMemberChange}
      onClose={onClose}
    />,
  )
  return { onClose, onMemberChange }
}
async function editAccess() {
  await click('Acessos')
  await click('Editar acessos')
}

describe('general collaborator profiles', () => {
  it('opens in consultation and requires an explicit edit action', async () => {
    await profile()
    expect(document.body.textContent).toContain('maria@example.com')
    expect(document.querySelector('input')).toBeNull()
    await click('Editar')
    expect(document.getElementById('employee-profile-name')).not.toBeNull()
  })
  it.each(['viewer', 'editor', 'manager'] as const)(
    'saves Honorários %s independently from Empresas',
    async (role) => {
      const configured = {
        ...member,
        moduleAccesses: [
          {
            module: 'companies' as const,
            enabled: true,
            role: 'manager' as const,
          },
          { module: 'honorarios' as const, enabled: false },
        ],
      }
      const update = vi
        .spyOn(organizationMemberService, 'update')
        .mockResolvedValue(response(configured))
      await profile(configured)
      await editAccess()
      await change('member-module-honorarios', role)
      await submit()
      expect(update).toHaveBeenCalledExactlyOnceWith('member-1', {
        displayName: 'Maria',
        moduleAccesses: [
          { module: 'routines', enabled: false },
          { module: 'processes', enabled: false },
          { module: 'companies', enabled: true, role: 'manager' },
          { module: 'honorarios', enabled: true, role },
        ],
      })
    },
  )
  it('sends a sector invitation and keeps its drawer open while pending', async () => {
    let completeInvitation!: () => void
    const invite = vi.fn(
      (input: MembershipInvitationInput) =>
        new Promise<MembershipInvitationResource>((resolve) => {
          completeInvitation = () =>
            resolve({
              ...input,
              id: 'invitation',
              expiresAt: '2026-10-30T12:00:00Z',
              createdAt: '',
            })
        }),
    )
    const cancel = vi.fn()
    await render(
      <CreateEmployeePage
        departments={departments}
        onInvite={invite}
        onCancel={cancel}
      />,
    )
    await change('employee-name', 'Nova pessoa')
    await change('employee-email', 'nova@example.com')
    await check('member-sector-processes-fin')
    await change('member-title-fin', 'Analista')
    await submit()
    expect(invite).toHaveBeenCalledWith({
      displayName: 'Nova pessoa',
      email: 'nova@example.com',
      role: 'member',
      moduleAccesses: [
        { module: 'routines', enabled: false },
        { module: 'companies', enabled: false },
        { module: 'honorarios', enabled: false },
        {
          module: 'processes',
          enabled: true,
          sectors: [{ sector: 'fin', role: 'fin', jobTitle: 'Analista' }],
        },
      ],
    })
    const drawer = document.querySelector(
      '[aria-labelledby="invitation-title"]',
    )!
    const close = drawer.querySelector<HTMLButtonElement>(
      'button[aria-label="Fechar convite"]',
    )!
    expect(drawer.getAttribute('aria-busy')).toBe('true')
    expect(close.disabled).toBe(true)
    await act(async () => {
      close.click()
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
      drawer.parentElement!.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      )
    })
    expect(cancel).not.toHaveBeenCalled()

    await act(async () => completeInvitation())
    expect(document.body.textContent).toContain('Convite enviado')
    await click('Ir para equipe')
    expect(cancel).toHaveBeenCalledOnce()
  })
  it('preserves profile and other grants while removing one Processos sector', async () => {
    const update = vi
      .spyOn(organizationMemberService, 'update')
      .mockResolvedValue(response(member))
    await profile()
    await editAccess()
    expect(
      (document.getElementById('member-title-fin') as HTMLInputElement).value,
    ).toBe('Analista financeiro')
    await check('member-sector-processes-fin')
    await submit()
    expect(update).toHaveBeenCalledExactlyOnceWith('member-1', {
      displayName: 'Maria',
      moduleAccesses: [
        { module: 'routines', enabled: false },
        { module: 'companies', enabled: false },
        { module: 'honorarios', enabled: false },
        {
          module: 'processes',
          enabled: true,
          sectors: [{ sector: 'reg', role: 'reg', jobTitle: 'Apoio' }],
        },
      ],
    })
  })
  it('revokes Processos when its last sector is deselected', async () => {
    const update = vi
      .spyOn(organizationMemberService, 'update')
      .mockResolvedValue(response(member))
    await profile()
    await editAccess()
    await check('member-sector-processes-fin')
    await check('member-sector-processes-reg')
    await submit()
    expect(update).toHaveBeenCalledWith(
      'member-1',
      expect.objectContaining({
        moduleAccesses: expect.arrayContaining([
          { module: 'processes', enabled: false },
        ]),
      }),
    )
  })
  it('saves profile changes without changing grants', async () => {
    const update = vi
      .spyOn(organizationMemberService, 'update')
      .mockResolvedValue(response(member))
    await profile()
    await click('Editar')
    await change('employee-profile-name', 'Maria Silva')
    await change('employee-profile-role', 'member')
    await submit()
    expect(update).toHaveBeenCalledWith(
      'member-1',
      expect.objectContaining({
        displayName: 'Maria Silva',
        role: 'member',
        moduleAccesses: expect.arrayContaining([
          {
            module: 'processes',
            enabled: true,
            sectors: member.moduleAccesses![1]!.sectors,
          },
        ]),
      }),
    )
  })
  it('keeps drafts after a failed save and asks before discarding them', async () => {
    vi.spyOn(organizationMemberService, 'update').mockRejectedValue(
      new Error('Departamento indisponível.'),
    )
    const { onClose } = await profile()
    await click('Editar')
    await change('employee-profile-name', 'Maria Silva')
    await submit()
    expect(document.body.textContent).toContain('Departamento indisponível.')
    expect(
      (document.getElementById('employee-profile-name') as HTMLInputElement)
        .value,
    ).toBe('Maria Silva')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Fechar perfil"]')!
        .click(),
    )
    expect(confirm).toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
  it('does not offer editing an owner to an administrator', async () => {
    await profile({ ...member, role: 'owner' }, false)
    expect(
      [...document.querySelectorAll('button')].some(
        (button) => button.textContent?.trim() === 'Editar',
      ),
    ).toBe(false)
    await click('Acessos')
    expect(document.getElementById('member-sector-processes-fin')).toBeNull()
  })
  it('does not offer access editing for an inactive member', async () => {
    await profile({ ...member, status: 'inactive' })
    await click('Acessos')
    expect(document.body.textContent).toContain(
      'contas ativas ou com convite pendente',
    )
    expect(
      [...document.querySelectorAll('button')].some(
        (button) => button.textContent?.trim() === 'Editar acessos',
      ),
    ).toBe(false)
  })
})
