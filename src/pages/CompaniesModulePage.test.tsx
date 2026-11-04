/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AuthContext,
  type AuthContextValue,
} from '../contexts/authContextDefinition'
import {
  companyService,
  type ClientCompanyResource,
} from '../services/companyService'
import type { ApiResponse } from '../services/httpClient'
import CompaniesModulePage from './CompaniesModulePage'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const company: ClientCompanyResource = {
  id: '00000000-0000-4000-8000-000000000001',
  code: 'EMP-001',
  name: 'Empresa de teste',
  legalName: 'Empresa de teste Ltda.',
  cnpj: '12345678000195',
  email: 'empresa@example.test',
  mobilePhone: '11999990000',
  taxRegime: 'Simples Nacional',
  version: 7,
  archivedAt: null,
  createdAt: '2026-01-01T12:00:00Z',
  updatedAt: '2026-01-01T12:00:00Z',
}
const response = <T,>(data: T, etag: string | null = null): ApiResponse<T> => ({
  data,
  status: 200,
  headers: new Headers(),
  etag,
  requestId: null,
})
let host: HTMLDivElement
let root: Root
let client: QueryClient

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.restoreAllMocks()
})

async function render(path: string) {
  const membership = {
    id: 'member-1',
    displayName: 'Ana Silva',
    role: 'owner' as const,
    status: 'active',
    organization: {
      id: 'org-1',
      name: 'Escritório',
      slug: 'escritorio',
      timezone: 'America/Sao_Paulo',
    },
  }
  const auth: AuthContextValue = {
    session: null,
    user: null,
    activeMembership: membership,
    memberships: [membership],
    isAuthenticated: true,
    isInitializing: false,
    initializationError: null,
    login: vi.fn(),
    logout: vi.fn(),
    selectActiveMembership: vi.fn(),
    refreshSession: vi.fn(),
  }
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <QueryClientProvider client={client}>
          <AuthContext.Provider value={auth}>
            <CompaniesModulePage />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    ),
  )
}

async function waitFor(check: () => boolean) {
  const until = Date.now() + 2000
  while (!check()) {
    if (Date.now() > until)
      throw new Error(`Estado não alcançado: ${host.textContent}`)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
}

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function field(label: string) {
  return [...host.querySelectorAll<HTMLLabelElement>('label')]
    .find((item) => item.textContent?.includes(label))
    ?.querySelector<HTMLInputElement>('input')!
}

describe('módulo independente de Empresas', () => {
  it('lista e atualiza dados gerais com a versão ETag da empresa', async () => {
    vi.spyOn(companyService, 'listAll').mockResolvedValue([company])
    const get = vi
      .spyOn(companyService, 'get')
      .mockResolvedValue(response(company, '"7"'))
    const update = vi
      .spyOn(companyService, 'update')
      .mockResolvedValue(response({ ...company, name: 'Nome atualizado' }))
    await render('/cadastro-empresas')
    await waitFor(() => host.textContent?.includes('Empresa de teste') ?? false)
    const row = host.querySelector<HTMLAnchorElement>(
      `a[href="/cadastro-empresas/${company.id}"]`,
    )!
    await act(async () => row.click())
    await waitFor(() => !!host.querySelector('form'))
    await act(async () => setInput(field('Nome fantasia'), 'Nome atualizado'))
    await act(async () =>
      host
        .querySelector('form')!
        .dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true }),
        ),
    )
    await waitFor(() => update.mock.calls.length === 1)
    expect(get).toHaveBeenCalledWith(company.id)
    expect(update).toHaveBeenCalledWith(
      company.id,
      expect.objectContaining({ name: 'Nome atualizado' }),
      '"7"',
    )
  })

  it('cadastra usando o campo de contrato name', async () => {
    vi.spyOn(companyService, 'listAll').mockResolvedValue([])
    const create = vi
      .spyOn(companyService, 'create')
      .mockResolvedValue(response({ ...company, id: 'new-company' }, '"1"'))
    await render('/cadastro-empresas/nova')
    await waitFor(() => !!host.querySelector('form'))
    await act(async () => setInput(field('Nome fantasia'), 'Nova Empresa'))
    await act(async () => setInput(field('CNPJ'), '12345678000111'))
    await act(async () =>
      host
        .querySelector('form')!
        .dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true }),
        ),
    )
    await waitFor(
      () =>
        host
          .querySelector('[role="alert"]')
          ?.textContent?.includes('CNPJ válido') ?? false,
    )
    expect(create).not.toHaveBeenCalled()
    await act(async () => setInput(field('CNPJ'), '12345678000195'))
    await act(async () =>
      host
        .querySelector('form')!
        .dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true }),
        ),
    )
    await waitFor(() => create.mock.calls.length === 1)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nova Empresa',
        cnpj: '12.345.678/0001-95',
      }),
    )
  })
})
