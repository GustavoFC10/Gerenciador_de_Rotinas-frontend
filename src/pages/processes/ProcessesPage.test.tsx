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
import {
  makeProcessTestResource,
  processTestCatalog,
} from '../../components/processes/processTestFixtures'
import { processQueryKeys } from '../../query/processQueryKeys'
import { ApiError, type ApiResponse } from '../../services/httpClient'
import { processService } from '../../services/processService'
import type { ProcessCatalog, ProcessResource } from '../../types/processes'
import ProcessesPage from './ProcessesPage'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const scope = { organizationId: 'org-1', membershipId: 'member-1' }
const response = <T,>(data: T): ApiResponse<T> => ({
  data,
  status: 200,
  headers: new Headers(),
  requestId: null,
  etag: null,
})
let host: HTMLDivElement
let root: Root
let client: QueryClient
let catalog: ProcessCatalog
let records: ProcessResource[]

beforeEach(() => {
  catalog = structuredClone(processTestCatalog)
  records = [makeProcessTestResource()]
  host = document.createElement('div')
  host.id = 'root'
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  vi.spyOn(processService, 'catalog').mockImplementation(async () =>
    response(catalog),
  )
  vi.spyOn(processService, 'listAll').mockImplementation(async () => records)
  vi.spyOn(processService, 'get').mockImplementation(async (id) =>
    response(records.find((record) => record.id === id)!),
  )
  vi.spyOn(processService, 'indicators').mockResolvedValue(
    response({
      total: 1,
      active: 1,
      late: 0,
      waiting: 0,
      completed: 0,
      cancelled: 0,
      bySector: { fin: 1, reg: 1 },
      byType: { abertura: 1 },
    }),
  )
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
    role: 'member' as const,
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
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <QueryClientProvider client={client}>
          <AuthContext.Provider value={auth}>
            <ProcessesPage />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
    await new Promise((resolve) => setTimeout(resolve, 15))
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 15))
  })
}

const button = (label: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.textContent?.trim() === label,
  )!
async function changeName(value: string) {
  const input = document.querySelector<HTMLInputElement>(
    '[role="dialog"] input[autocomplete="off"]',
  )!
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submitForm() {
  await act(async () => {
    document
      .querySelector('[role="dialog"] form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 15))
  })
}

describe('ProcessesPage integration', () => {
  it('stops displaying cached details when the backend revokes resource access', async () => {
    records[0] = makeProcessTestResource({
      obs: 'Informação anterior restrita',
    })
    await render('/processos/process-1')
    expect(host.querySelector('main')?.textContent).toContain(
      'Informação anterior restrita',
    )
    vi.mocked(processService.get).mockRejectedValue(
      new ApiError({
        problem: { type: 'forbidden', title: 'Sem acesso', status: 403 },
        requestId: null,
        response: new Response(null, { status: 403 }),
      }),
    )
    await act(async () => {
      await client.invalidateQueries({
        queryKey: processQueryKeys.detail(scope, 'process-1'),
      })
      await new Promise((resolve) => setTimeout(resolve, 15))
    })
    expect(host.querySelector('main')?.textContent).toContain(
      'Processo indisponível',
    )
    expect(host.querySelector('main')?.textContent).not.toContain(
      'Informação anterior restrita',
    )
  })
  it('restricts Regularidade navigation and avoids querying financial reports even on direct links', async () => {
    catalog.permissions = {
      ...catalog.permissions,
      create: false,
      edit: false,
      viewFinancial: false,
      viewMovements: false,
      sectors: ['reg'],
      executeSectors: ['reg'],
    }
    const report = vi.spyOn(processService, 'monthlyReport')
    await render('/processos/movimentacoes')
    expect(host.textContent).toContain('Acesso restrito')
    expect(host.querySelector('.top')?.textContent).not.toContain(
      'Novo processo',
    )
    expect(host.querySelector('.side-scroll')?.textContent).not.toContain(
      'Movimentações Empresariais',
    )
    expect(report).not.toHaveBeenCalled()
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.dept-card')!.click(),
    )
    expect(host.querySelectorAll('.dept-menu button')).toHaveLength(1)
  })

  it('keeps scheduled processes outside the sector queue using server analysis', async () => {
    records.push(
      makeProcessTestResource({
        id: 'waiting',
        empresa: 'Empresa Agendada',
        analysis: {
          currentStage: 0,
          completedTasks: 0,
          totalTasks: 4,
          waiting: true,
          late: false,
          releaseDate: '2027-02-22',
          pendingSectors: ['com'],
        },
      }),
    )
    records[0] = makeProcessTestResource({
      empresa: 'Empresa da Diretoria',
      analysis: { ...records[0]!.analysis, pendingSectors: ['com'] },
    })
    await render('/processos/fila')
    expect(host.querySelector('main')?.textContent).toContain(
      'Empresa da Diretoria',
    )
    expect(host.querySelector('main')?.textContent).not.toContain(
      'Empresa Agendada',
    )
  })

  it('repeats an unconfirmed opening with exactly the same idempotency key and payload', async () => {
    const create = vi
      .spyOn(processService, 'create')
      .mockRejectedValueOnce(new Error('Conexão interrompida'))
      .mockResolvedValueOnce(response(records[0]!))
    await render('/processos?tipo=abertura')
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.top .primary')!.click(),
    )
    await changeName('Empresa Nova')
    await submitForm()
    expect(
      document.querySelector('[role="dialog"] [role="status"]')?.textContent,
    ).toContain('sem duplicar')
    await submitForm()
    expect(create).toHaveBeenCalledTimes(2)
    expect(create.mock.calls[0]).toEqual(create.mock.calls[1])
    expect(create.mock.calls[0]?.[1]).toMatch(/^[\w-]{36}$/)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('retains the edit snapshot version when a background refresh changes the resource', async () => {
    const original = records[0]!
    const conflict = new ApiError({
      problem: {
        type: 'conflict',
        title: 'Versão antiga',
        status: 409,
        detail: 'Recarregue o processo.',
      },
      requestId: null,
      response: new Response(null, { status: 409 }),
    })
    const update = vi
      .spyOn(processService, 'update')
      .mockRejectedValue(conflict)
    await render('/processos/process-1')
    await act(async () => button('Editar').click())
    await changeName('Meu ajuste')
    const latest = {
      ...original,
      version: 5,
      empresa: 'Ajuste da equipe',
      protocolo: 'PROTO-NOVO',
    }
    records = [latest]
    await act(async () =>
      client.setQueryData(processQueryKeys.detail(scope, original.id), latest),
    )
    await submitForm()
    expect(update).toHaveBeenCalledWith(original.id, {
      version: 4,
      empresa: 'Meu ajuste',
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(host.querySelector('main')?.textContent).toContain(
      'Ajuste da equipe',
    )
  })
})
