/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router'
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
import { ProcessContractError } from '../../services/processContract'
import type {
  ProcessCatalog,
  ProcessFilters,
  ProcessIndicators,
  ProcessPage,
  ProcessResource,
  ProcessStatus,
  ProcessSummary,
} from '../../types/processes'
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

function serverResults(filters: ProcessFilters = {}) {
  return records.filter(
    (record) =>
      (!filters.status?.length || filters.status.includes(record.status)) &&
      (!filters.tipo || record.tipo === filters.tipo) &&
      (!filters.responsibleSector ||
        record.responsibleSectors.includes(filters.responsibleSector)) &&
      (!filters.queueSector ||
        (['andamento', 'atrasado'].includes(record.status) &&
          record.analysis.pendingSectors.includes(filters.queueSector))) &&
      (!filters.q || record.empresa.includes(filters.q)),
  )
}
function summary(record: ProcessResource): ProcessSummary {
  return Object.fromEntries(
    [
      'id',
      'organizationId',
      'tipo',
      'codigo',
      'empresa',
      'companyId',
      'cnpj',
      'protocolo',
      'prazo',
      'criadoPor',
      'autorAbertura',
      'criadoEm',
      'atualizadoEm',
      'concluidoEm',
      'status',
      'statusChangedAt',
      'statusNextEvaluationAt',
      'responsibleSectors',
      'version',
      'workflowVersion',
      'analysis',
      'permissions',
    ].map((key) => [key, record[key as keyof ProcessResource]]),
  ) as unknown as ProcessSummary
}

function indicatorResults(filters: ProcessFilters = {}): ProcessIndicators {
  const matches = serverResults(filters)
  const byStatus: Record<ProcessStatus, number> = {
    andamento: 0,
    agendado: 0,
    atrasado: 0,
    concluido: 0,
    cancelado: 0,
  }
  for (const record of matches) byStatus[record.status]++
  return {
    total: matches.length,
    active: byStatus.andamento + byStatus.agendado + byStatus.atrasado,
    completed: byStatus.concluido,
    cancelled: byStatus.cancelado,
    waiting: byStatus.agendado,
    late: byStatus.atrasado,
    byStatus,
    bySector: Object.fromEntries(
      ['com', 'fin', 'reg'].map((sector) => [
        sector,
        matches.filter(
          (record) =>
            ['andamento', 'atrasado'].includes(record.status) &&
            record.analysis.pendingSectors.includes(
              sector as 'com' | 'fin' | 'reg',
            ),
        ).length,
      ]),
    ),
    byType: Object.fromEntries(
      catalog.types.map((type) => [
        type.id,
        matches.filter((record) => record.tipo === type.id).length,
      ]),
    ),
  }
}

function httpError(status: number, retryAfter?: number) {
  return new ApiError({
    problem: {
      type: 'test-http',
      title: 'Falha HTTP de teste',
      status,
      detail: `Resposta HTTP ${status}`,
    },
    requestId: 'request-processes-test',
    response: new Response(null, {
      status,
      headers: retryAfter ? { 'Retry-After': String(retryAfter) } : {},
    }),
  })
}

async function waitFor(check: () => boolean, timeout = 2000) {
  const deadline = Date.now() + timeout
  while (!check()) {
    if (Date.now() >= deadline)
      throw new Error(
        `A interface não atingiu o estado esperado: ${host.querySelector('main')?.textContent}`,
      )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
}

async function settle() {
  for (let step = 0; step < 3; step++)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
}

function LocationProbe() {
  const location = useLocation()
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  )
}

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
  vi.spyOn(processService, 'list').mockImplementation(async (filters = {}) => {
    const matches = serverResults(filters)
    const page = filters.page ?? 1
    const size = filters.pageSize ?? 50
    return response({
      count: matches.length,
      previous: page > 1 ? '?page=1' : null,
      next: page * size < matches.length ? `?page=${page + 1}` : null,
      results: matches.slice((page - 1) * size, page * size).map(summary),
    })
  })
  vi.spyOn(processService, 'entries').mockResolvedValue(
    response({ count: 0, next: null, previous: null, results: [] }),
  )
  vi.spyOn(processService, 'alerts').mockResolvedValue(
    response({ count: 0, next: null, previous: null, results: [] }),
  )
  vi.spyOn(processService, 'followUps').mockResolvedValue(
    response({ count: 0, next: null, previous: null, results: [] }),
  )
  vi.spyOn(processService, 'companyOptions').mockResolvedValue(
    response({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          code: 'EMP-01',
          name: 'Empresa Nova',
          legalName: 'Empresa Nova Ltda.',
          cnpj: '12345678000195',
          status: 'active',
        },
      ],
    }),
  )
  vi.spyOn(processService, 'get').mockImplementation(async (id) =>
    response(records.find((record) => record.id === id)!),
  )
  vi.spyOn(processService, 'indicators').mockImplementation(
    async (filters = {}) => response(indicatorResults(filters)),
  )
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
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
    refreshSession: vi.fn().mockResolvedValue(undefined),
  }
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <QueryClientProvider client={client}>
          <AuthContext.Provider value={auth}>
            <ProcessesPage />
            <LocationProbe />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
  })
  await waitFor(
    () =>
      !!host.querySelector('main') &&
      !host.querySelector('main')!.textContent?.startsWith('Carregando') &&
      !host.querySelector('.process-list[aria-busy="true"]'),
  )
}

const button = (label: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.textContent?.trim() === label,
  )!
async function changeFormValue(
  value: string,
  selector = '[role="dialog"] input[autocomplete="off"]',
) {
  const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    selector,
  )!
  const prototype =
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function searchList(value: string, waitForResults = true) {
  const input = host.querySelector<HTMLInputElement>(
    'main input[type="search"]',
  )!
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await settle()
  if (waitForResults)
    await waitFor(() => !host.querySelector('.process-list[aria-busy="true"]'))
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
  it('shows one creation action and one contextual search without repeating KPI cards or implicit statuses', async () => {
    await render('/processos/lista?situacao=ativos')
    expect(
      host.querySelectorAll('button[aria-label="Novo processo"]'),
    ).toHaveLength(1)
    expect(
      [...host.querySelectorAll('button')].filter(
        (item) => item.textContent?.trim() === 'Novo processo',
      ),
    ).toHaveLength(1)
    expect(host.querySelectorAll('input[type="search"]')).toHaveLength(1)
    expect(host.querySelector('main .scards')).toBeNull()
    expect(
      host.querySelector('[aria-label="Filtros adicionais ativos"]'),
    ).toBeNull()
    expect(host.querySelector('select[multiple]')).toBeNull()
    expect(host.textContent).toContain('Contagens de toda a organização')
    await searchList('Empresa inexistente')
    expect(host.querySelector('main')?.textContent).toContain(
      '0 processos nesta lista',
    )
    expect(
      host.querySelector('.subnav [aria-current="page"] .ct')?.textContent,
    ).toBe('1')
    expect(processService.indicators).toHaveBeenCalledTimes(1)
    expect(processService.indicators).toHaveBeenCalledWith(
      {},
      expect.any(AbortSignal),
    )
  })

  it('keeps a single creation entry point when the home page is empty', async () => {
    records = []
    await render('/processos')
    expect(
      [...host.querySelectorAll('button')].filter(
        (item) => item.textContent?.trim() === 'Novo processo',
      ),
    ).toHaveLength(1)
  })

  it('keeps search focused and preserves trailing spaces while a new filtered page is loading', async () => {
    await render('/processos/lista?situacao=todos')
    const input = host.querySelector<HTMLInputElement>(
      'main input[type="search"]',
    )!
    input.focus()
    let finish!: (page: ApiResponse<ProcessPage>) => void
    vi.mocked(processService.list).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    await searchList('Empresa ', false)
    expect(host.querySelector('main input[type="search"]')).toBe(input)
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('Empresa ')
    expect(host.querySelector('main')?.textContent).toContain(
      'Carregando processos…',
    )
    expect(host.querySelector('main')?.textContent).not.toContain(
      '0 processos nesta lista',
    )
    await act(async () =>
      finish(
        response({
          count: 1,
          next: null,
          previous: null,
          results: [summary(records[0]!)],
        }),
      ),
    )
    await waitFor(() => !!host.querySelector('.lrow'))
    expect(host.querySelector('main input[type="search"]')).toBe(input)
    expect(input.value).toBe('Empresa ')
    expect(processService.list).toHaveBeenLastCalledWith(
      { q: 'Empresa', page: 1, pageSize: 50 },
      expect.any(AbortSignal),
    )
  })

  it('clears refinements while retaining the selected view and page size', async () => {
    records = [makeProcessTestResource({ status: 'agendado' })]
    await render(
      '/processos/lista?situacao=agendados&q=ausente&tipo=mei&month=2026-01&responsibleSector=reg&pageSize=25&page=2',
    )
    await act(async () => button('Limpar filtros').click())
    await waitFor(() => !!host.querySelector('.lrow'))
    expect(processService.list).toHaveBeenLastCalledWith(
      { status: ['agendado'], page: 1, pageSize: 25 },
      expect.any(AbortSignal),
    )
    expect(host.querySelector('[data-testid="location"]')?.textContent).toBe(
      '/processos/lista?situacao=agendados&pageSize=25',
    )
  })

  it('keeps the queue sector when clearing its additional filters', async () => {
    records = [
      makeProcessTestResource({
        analysis: { ...records[0]!.analysis, pendingSectors: ['com'] },
      }),
    ]
    await render('/processos/fila?q=ausente&page=2&pageSize=10')
    await act(async () => button('Limpar filtros').click())
    await waitFor(() => !!host.querySelector('.lrow'))
    expect(processService.list).toHaveBeenLastCalledWith(
      { queueSector: 'com', page: 1, pageSize: 10 },
      expect.any(AbortSignal),
    )
    expect(host.querySelector('[data-testid="location"]')?.textContent).toBe(
      '/processos/fila?pageSize=10',
    )
  })

  it('preserves search and type when changing the navigation view and resets pagination', async () => {
    await render(
      '/processos/lista?situacao=todos&q=Empresa&tipo=abertura&page=2&pageSize=25',
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('.subnav button')]
        .find((item) => item.textContent?.startsWith('Aguardando liberação'))!
        .click(),
    )
    await waitFor(
      () =>
        host.querySelector('main h1')?.textContent === 'Aguardando liberação',
    )
    expect(processService.list).toHaveBeenLastCalledWith(
      {
        status: ['agendado'],
        q: 'Empresa',
        tipo: 'abertura',
        page: 1,
        pageSize: 25,
      },
      expect.any(AbortSignal),
    )
  })

  it('leaves the queue route when personalizing situations and omits the last deselected status', async () => {
    records.push(
      makeProcessTestResource({
        id: 'closed-process',
        empresa: 'Empresa concluída',
        status: 'concluido',
      }),
    )
    await render('/processos/fila')
    await act(async () => button('Mais filtros').click())
    await act(async () => button('Personalizar situações').click())
    await waitFor(
      () => host.querySelector('main h1')?.textContent === 'Todos os processos',
    )
    expect(
      host.querySelector('[data-testid="location"]')?.textContent,
    ).toContain('/processos/lista?situacao=todos')
    let checks = [
      ...host.querySelectorAll<HTMLInputElement>(
        '.process-list-status-options input',
      ),
    ]
    await act(async () => checks[0]!.click())
    await settle()
    expect(vi.mocked(processService.list).mock.lastCall?.[0]?.status).toEqual([
      'andamento',
    ])
    checks = [
      ...host.querySelectorAll<HTMLInputElement>(
        '.process-list-status-options input',
      ),
    ]
    await act(async () => checks[0]!.click())
    await settle()
    await waitFor(() => host.querySelectorAll('.lrow').length === 2)
    expect(host.querySelector('main')?.textContent).toContain(
      'Empresa concluída',
    )
    expect(
      host.querySelector('[data-testid="location"]')?.textContent,
    ).not.toContain('status=')
  })

  it('does not label an explicit incompatible status query as the Abertos view', async () => {
    await render('/processos/lista?situacao=ativos&status=concluido')
    expect(host.querySelector('main h1')?.textContent).toBe(
      'Todos os processos',
    )
    expect(
      host.querySelector('.subnav [aria-current="page"]')?.textContent,
    ).toContain('Todos os processos')
    expect(processService.list).toHaveBeenLastCalledWith(
      { status: ['concluido'], page: 1, pageSize: 50 },
      expect.any(AbortSignal),
    )
  })

  it('moves explicit status filters from a legacy queue URL into the custom list', async () => {
    records = [makeProcessTestResource({ status: 'cancelado' })]
    await render('/processos/fila?status=cancelado&q=Empresa')
    await waitFor(() =>
      host
        .querySelector('[data-testid="location"]')!
        .textContent!.startsWith('/processos/lista?'),
    )
    expect(host.querySelector('main h1')?.textContent).toBe(
      'Todos os processos',
    )
    expect(processService.list).toHaveBeenLastCalledWith(
      { status: ['cancelado'], q: 'Empresa', page: 1, pageSize: 50 },
      expect.any(AbortSignal),
    )
    expect(host.querySelector('button.nav-i[aria-current="page"]')).toBeNull()
  })
  it('reserves the alerts route and uses the global pending count without loading processes or all alerts', async () => {
    vi.mocked(processService.alerts).mockResolvedValue(
      response({ count: 83, next: '?page=2', previous: null, results: [] }),
    )
    await render('/processos/avisos')
    await waitFor(() => host.textContent!.includes('83 avisos'))
    expect(processService.get).not.toHaveBeenCalled()
    expect(processService.alerts).toHaveBeenCalledWith(
      { status: 'pending', pageSize: 1 },
      expect.any(AbortSignal),
    )
    expect(processService.alerts).toHaveBeenCalledWith(
      { status: 'pending', kind: undefined, page: 1, pageSize: 50 },
      expect.any(AbortSignal),
    )
    expect(
      vi
        .mocked(processService.alerts)
        .mock.calls.every(([filters]) => !filters?.page || filters.page === 1),
    ).toBe(true)
    const nav = host.querySelector<HTMLAnchorElement>(
      'a[href="/processos/avisos"]',
    )!
    expect(nav.textContent).toContain('83')
  })

  it.each(['fin', 'reg'] as const)(
    'blocks direct alerts access for %s without fetching restricted data',
    async (sector) => {
      catalog.permissions = {
        ...catalog.permissions,
        create: false,
        executeSectors: [sector],
      }
      await render('/processos/avisos')
      expect(host.querySelector('main')?.textContent).toContain(
        'Acesso restrito',
      )
      expect(host.querySelector('a[href="/processos/avisos"]')).toBeNull()
      expect(processService.alerts).not.toHaveBeenCalled()
      expect(processService.get).not.toHaveBeenCalled()
    },
  )

  it('shows complementary follow-ups to Financeiro in its queue and keeps them outside workflow totals', async () => {
    catalog.permissions = {
      ...catalog.permissions,
      create: false,
      executeSectors: ['fin'],
    }
    await render('/processos/fila')
    await waitFor(
      () => !!host.querySelector('[aria-label="Cobranças da Leggacy"]'),
    )
    expect(processService.followUps).toHaveBeenCalledWith(
      { processId: undefined, state: 'pending', page: 1, pageSize: 50 },
      expect.any(AbortSignal),
    )
    expect(processService.alerts).not.toHaveBeenCalled()
    expect(records[0]!.analysis.completedTasks).toBe(0)
    expect(records[0]!.analysis.totalTasks).toBe(4)
  })

  it('removes alert content, recipients and counters when the catalog revokes Diretoria access', async () => {
    await render('/processos/avisos')
    await act(async () => {
      client.setQueryData(processQueryKeys.alertRecipients(scope, {}), {
        results: [{ email: 'restrito@example.com' }],
      })
      client.setQueryData(processQueryKeys.alert(scope, 'test-alert'), {
        body: 'Conteúdo restrito',
      })
      catalog = {
        ...catalog,
        permissions: { ...catalog.permissions, create: false },
      }
      client.setQueryData(processQueryKeys.catalog(scope), catalog)
    })
    await waitFor(() =>
      host.querySelector('main')!.textContent!.includes('Acesso restrito'),
    )
    expect(
      client.getQueriesData({ queryKey: processQueryKeys.alerts(scope) }),
    ).toEqual([])
    expect(
      client.getQueriesData({
        queryKey: processQueryKeys.alertRecipients(scope),
      }),
    ).toEqual([])
    expect(
      client.getQueryData(processQueryKeys.alert(scope, 'test-alert')),
    ).toBeUndefined()
    expect(host.querySelector('a[href="/processos/avisos"]')).toBeNull()
  })

  it('keeps process reading available when only the alert counter is forbidden', async () => {
    vi.mocked(processService.alerts).mockRejectedValue(httpError(403))
    await render('/processos/lista?situacao=todos')
    await settle()
    expect(host.querySelector('main')?.textContent).toContain('Empresa Exemplo')
    expect(host.querySelector('a[href="/processos/avisos"]')).toBeNull()
    expect(
      client.getQueriesData({ queryKey: processQueryKeys.alerts(scope) }),
    ).toEqual([])
  })

  it('invalidates complementary situations and their history after editing a process', async () => {
    vi.spyOn(processService, 'update').mockImplementation(async (id, patch) => {
      const result = {
        ...records[0]!,
        ...patch,
        id,
        version: records[0]!.version + 1,
      }
      records = [result]
      return response(result)
    })
    await render('/processos/process-1')
    const followUpsKey = processQueryKeys.followUps(scope, {
      processId: 'process-1',
      state: 'resolved',
    })
    const alertKey = processQueryKeys.alert(scope, 'historic-alert')
    client.setQueryData(followUpsKey, { count: 1, results: [] })
    client.setQueryData(alertKey, { version: 1 })
    await act(async () => button('Editar').click())
    await changeFormValue(
      'Observação atualizada',
      '[role="dialog"] textarea[id$="-obs"]',
    )
    await submitForm()
    expect(host.querySelector('main')?.textContent).toContain(
      'Observação atualizada',
    )
    expect(client.getQueryState(followUpsKey)?.isInvalidated).toBe(true)
    expect(client.getQueryState(alertKey)?.isInvalidated).toBe(true)
  })

  it('shows each second-visit workflow at home with status, responsibility and release when the executable queue is empty', async () => {
    records = (['abertura', 'mei', 'outro', 'reativacao'] as const).map(
      (tipo) =>
        makeProcessTestResource({
          id: `waiting-${tipo}`,
          tipo,
          empresa: `Acompanhamento ${tipo}`,
          status: 'agendado',
          responsibleSectors: ['fin'],
          analysis: {
            currentStage: 3,
            completedTasks: 6,
            totalTasks: 7,
            releaseDate: '2027-02-22',
            waiting: true,
            late: false,
            pendingSectors: [],
          },
        }),
    )
    await render('/processos')
    const main = host.querySelector('main')!
    expect(main.textContent).toContain('Nenhuma ação liberada')
    for (const tipo of ['abertura', 'mei', 'outro', 'reativacao'])
      expect(main.textContent).toContain(`Acompanhamento ${tipo}`)
    expect(main.textContent).toContain('Aguardando liberação')
    expect(main.textContent).toContain('Responsável: Financeiro')
    expect(main.textContent).toContain('Libera em 22/02/2027')
    const queries = vi
      .mocked(processService.list)
      .mock.calls.map(([filters]) => filters!)
    expect(queries).toHaveLength(3)
    expect(queries).toContainEqual(
      expect.objectContaining({ status: ['agendado'], pageSize: 6 }),
    )
    expect(queries).toContainEqual(
      expect.objectContaining({ queueSector: 'com', pageSize: 8 }),
    )
    expect(
      queries.every((filters) => !filters.page || filters.page === 1),
    ).toBe(true)
  })

  it('queries all three open statuses and keeps the global list independent from the selected queue sector', async () => {
    await render('/processos/fila')
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.dept-card')!.click(),
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('.dept-menu button')]
        .find((item) => item.textContent === 'Financeiro')!
        .click(),
    )
    await waitFor(() =>
      vi
        .mocked(processService.list)
        .mock.calls.some(([filters]) => filters?.queueSector === 'fin'),
    )
    const countBefore = vi.mocked(processService.list).mock.calls.length
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('.subnav button')]
        .find((item) => item.textContent?.startsWith('Abertos'))!
        .click(),
    )
    await waitFor(
      () =>
        host.querySelector('main h1')?.textContent === 'Abertos' &&
        !host.querySelector('.process-list[aria-busy="true"]'),
    )
    await settle()
    const queries = vi
      .mocked(processService.list)
      .mock.calls.slice(countBefore)
      .map(([filters]) => filters!)
    expect(
      queries.some(
        (filters) =>
          filters.status?.length === 3 &&
          ['andamento', 'agendado', 'atrasado'].every((status) =>
            filters.status!.includes(status as ProcessStatus),
          ),
      ),
    ).toBe(true)
    expect(queries.every((filters) => filters.queueSector === undefined)).toBe(
      true,
    )
  })

  it('loads only the requested page, retains filters after a detail visit, and resets pagination on filter changes', async () => {
    records = Array.from({ length: 3 }, (_, index) =>
      makeProcessTestResource({
        id: `page-process-${index}`,
        empresa: `Empresa ${index}`,
        responsibleSectors: ['fin'],
      }),
    )
    const requested =
      '/processos/lista?situacao=todos&tipo=abertura&responsibleSector=fin&pageSize=1&page=2'
    await render(requested)
    expect(host.querySelectorAll('.lrow')).toHaveLength(1)
    expect(host.querySelector('.lrow')!.textContent).toContain('Empresa 1')
    expect(processService.list).toHaveBeenCalledTimes(1)
    expect(processService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 2,
        pageSize: 1,
        tipo: 'abertura',
        responsibleSector: 'fin',
      }),
      expect.any(AbortSignal),
    )
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.lrow')!.click(),
    )
    await waitFor(() => !!host.querySelector('#procPage'))
    expect(processService.get).toHaveBeenCalledWith(
      'page-process-1',
      expect.any(AbortSignal),
    )
    await act(async () => button('Voltar para processos').click())
    await waitFor(
      () => host.querySelector('main h1')?.textContent === 'Todos os processos',
    )
    expect(host.querySelector('[data-testid="location"]')?.textContent).toBe(
      requested,
    )
    expect(host.querySelector('.lrow')!.textContent).toContain('Empresa 1')
    await act(async () => button('Próxima página').click())
    await waitFor(
      () =>
        host.querySelector('.lrow')?.textContent?.includes('Empresa 2') ??
        false,
    )
    expect(
      vi
        .mocked(processService.list)
        .mock.calls.map(([filters]) => filters?.page),
    ).toEqual([2, 3])
    const type = host.querySelector<HTMLSelectElement>(
      '[aria-label="Tipo de processo"]',
    )!
    await act(async () => {
      type.value = ''
      type.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await waitFor(
      () =>
        host.querySelector('.lrow')?.textContent?.includes('Empresa 0') ??
        false,
    )
    expect(processService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, responsibleSector: 'fin' }),
      expect.any(AbortSignal),
    )
    expect(
      vi.mocked(processService.list).mock.lastCall?.[0],
    ).not.toHaveProperty('tipo')
  })

  it('resets the queue page when changing the execution sector', async () => {
    records = Array.from({ length: 4 }, (_, index) =>
      makeProcessTestResource({
        id: `queue-${index}`,
        empresa: `Fila ${index}`,
        responsibleSectors: index < 2 ? ['com'] : ['fin'],
        analysis: {
          ...records[0]!.analysis,
          pendingSectors: index < 2 ? ['com'] : ['fin'],
        },
      }),
    )
    await render('/processos/fila?page=2&pageSize=1')
    expect(host.querySelector('.lrow')?.textContent).toContain('Fila 1')
    await act(async () =>
      host.querySelector<HTMLButtonElement>('.dept-card')!.click(),
    )
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('.dept-menu button')]
        .find((item) => item.textContent === 'Financeiro')!
        .click(),
    )
    await waitFor(
      () =>
        host.querySelector('.lrow')?.textContent?.includes('Fila 2') ?? false,
    )
    expect(processService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, pageSize: 1, queueSector: 'fin' }),
      expect.any(AbortSignal),
    )
    expect(
      host.querySelector('[data-testid="location"]')?.textContent,
    ).not.toContain('page=2')
  })

  it.each([400, 429, 503])(
    'presents HTTP %s as an error and does not retry automatically',
    async (status) => {
      vi.mocked(processService.list).mockRejectedValue(
        httpError(status, status === 400 ? undefined : 30),
      )
      await render('/processos/lista?situacao=todos')
      const main = host.querySelector('main')!
      expect(main.querySelector('[role="alert"]')).not.toBeNull()
      expect(main.textContent).not.toContain('Nenhum processo cadastrado')
      expect(main.textContent).not.toContain('Nenhum resultado nos filtros')
      expect(main.textContent).toContain('request-processes-test')
      if (status !== 400) {
        const retry = [
          ...main.querySelectorAll<HTMLButtonElement>('button'),
        ].find((item) => item.textContent?.includes('Aguarde'))!
        expect(retry.disabled).toBe(true)
        await act(async () => retry.click())
      }
      await settle()
      expect(processService.list).toHaveBeenCalledTimes(1)
    },
  )

  it('presents incompatible payloads with their request reference instead of a successful empty collection', async () => {
    vi.mocked(processService.list).mockRejectedValue(
      new ProcessContractError(
        'response.results.0.status',
        'contract-request-42',
      ),
    )
    await render('/processos/lista?situacao=todos')
    const main = host.querySelector('main')!
    expect(main.textContent).toContain('Resposta incompatível')
    expect(main.textContent).toContain('contract-request-42')
    expect(main.querySelector('[role="alert"]')).not.toBeNull()
    expect(main.textContent).not.toContain('Nenhum processo cadastrado')
    await settle()
    expect(processService.list).toHaveBeenCalledTimes(1)
  })

  it.each([429, 503, 'contract'] as const)(
    'exposes a %s detail refresh failure even when an old detail is cached',
    async (failure) => {
      records[0] = makeProcessTestResource({ obs: 'Conteúdo anterior ao erro' })
      await render('/processos/process-1')
      expect(host.querySelector('main')?.textContent).toContain(
        'Conteúdo anterior ao erro',
      )
      vi.mocked(processService.get).mockRejectedValue(
        failure === 'contract'
          ? new ProcessContractError(
              'response.status',
              'detail-contract-request',
            )
          : httpError(failure, 30),
      )
      await act(async () => {
        await client.invalidateQueries({
          queryKey: processQueryKeys.detail(scope, 'process-1'),
        })
      })
      await waitFor(() => !!host.querySelector('main [role="alert"]'))
      expect(host.querySelector('main')?.textContent).toContain(
        'Processo indisponível',
      )
      expect(host.querySelector('main')?.textContent).not.toContain(
        'Conteúdo anterior ao erro',
      )
      if (failure === 'contract')
        expect(host.querySelector('main')?.textContent).toContain(
          'detail-contract-request',
        )
      else {
        const retry = [
          ...host.querySelectorAll<HTMLButtonElement>('main button'),
        ].find((item) => item.textContent?.includes('Aguarde'))!
        expect(retry.disabled).toBe(true)
        await act(async () => retry.click())
      }
      await settle()
      expect(processService.get).toHaveBeenCalledTimes(2)
    },
  )

  it('does not restore an old scope cache or navigate when an opening finishes after leaving that context', async () => {
    let finishOpening!: (result: ApiResponse<ProcessResource>) => void
    vi.spyOn(processService, 'create').mockImplementation(
      () =>
        new Promise((resolve) => {
          finishOpening = resolve
        }),
    )
    await render('/processos?tipo=abertura')
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>('button[aria-label="Novo processo"]')!
        .click(),
    )
    await waitFor(
      () =>
        document.querySelector<HTMLButtonElement>('.company-option') !== null,
    )
    await act(async () =>
      document.querySelector<HTMLButtonElement>('.company-option')!.click(),
    )
    await submitForm()
    expect(processService.create).toHaveBeenCalledTimes(1)
    await act(async () => root.render(<div>Outro contexto ativo</div>))
    expect(
      client
        .getQueryCache()
        .findAll({ queryKey: processQueryKeys.root(scope) }),
    ).toHaveLength(0)
    await act(async () => {
      finishOpening(response(records[0]!))
      await Promise.resolve()
    })
    await settle()
    expect(
      client
        .getQueryCache()
        .findAll({ queryKey: processQueryKeys.root(scope) }),
    ).toHaveLength(0)
    expect(host.textContent).toBe('Outro contexto ativo')
  })

  it('distinguishes a successful empty collection from a successful filtered search with no matches', async () => {
    records = []
    await render('/processos/lista?situacao=todos')
    expect(host.querySelector('main')?.textContent).toContain(
      'Nenhum processo nesta lista',
    )
    expect(host.querySelector('main [role="alert"]')).toBeNull()
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('.subnav button')]
        .find((item) => item.textContent?.startsWith('Abertos'))!
        .click(),
    )
    await waitFor(
      () => host.querySelector('main h1')?.textContent === 'Abertos',
    )
    await waitFor(() => !host.querySelector('.process-list[aria-busy="true"]'))
    expect(host.querySelector('main')?.textContent).toContain(
      'Nenhum processo nesta lista',
    )
    await searchList('Empresa inexistente')
    expect(host.querySelector('main')?.textContent).toContain(
      'Nenhum resultado nos filtros',
    )
    expect(host.querySelector('main [role="alert"]')).toBeNull()
  })

  it('removes cached process scopes when list access is revoked and prevents stale detail reopening', async () => {
    records[0] = makeProcessTestResource({ obs: 'Segredo já revogado' })
    client.setQueryData(
      processQueryKeys.detail(scope, records[0]!.id),
      records[0],
    )
    client.setQueryData(
      processQueryKeys.entries(scope, records[0]!.id, { kind: 'note' }),
      { count: 1, results: [{ text: 'Segredo em comentário' }] },
    )
    client.setQueryData(processQueryKeys.report(scope, '2026-10'), {
      gain: '99999.00',
    })
    vi.mocked(processService.list).mockRejectedValue(httpError(403))
    await render('/processos/lista?situacao=todos')
    await waitFor(
      () =>
        client.getQueryData(processQueryKeys.detail(scope, 'process-1')) ===
        undefined,
    )
    expect(
      client.getQueryData(
        processQueryKeys.entries(scope, 'process-1', { kind: 'note' }),
      ),
    ).toBeUndefined()
    expect(
      client.getQueryData(processQueryKeys.report(scope, '2026-10')),
    ).toBeUndefined()
    expect(host.textContent).not.toContain('Segredo já revogado')
    expect(host.querySelector('main [role="alert"]')).not.toBeNull()
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('.subnav button')]
        .find((item) => item.textContent?.startsWith('Todos os processos'))!
        .click(),
    )
    await settle()
    expect(host.querySelector('main [role="alert"]')).not.toBeNull()
    expect(processService.get).not.toHaveBeenCalled()
    expect(processService.list).toHaveBeenCalledTimes(1)
  })

  it('closes an edit snapshot and hides its private values when catalog permissions are reduced', async () => {
    records[0] = makeProcessTestResource({
      obs: 'Texto financeiro privado',
      custo: '12345.67',
    })
    await render('/processos/process-1')
    await act(async () => button('Editar').click())
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    const {
      custo: _custo,
      obs: _obs,
      honorario: _honorario,
      ...publicRecord
    } = records[0]!
    void _custo
    void _obs
    void _honorario
    const reduced = {
      ...catalog.permissions,
      create: false,
      edit: false,
      viewFinancial: false,
      viewMovements: false,
    }
    records[0] = { ...publicRecord, permissions: reduced }
    catalog = { ...catalog, permissions: reduced }
    await act(async () => {
      client.setQueryData(
        processQueryKeys.detail(scope, 'process-1'),
        records[0],
      )
      client.setQueryData(processQueryKeys.catalog(scope), catalog)
    })
    await waitFor(() => document.querySelector('[role="dialog"]') === null)
    expect(host.textContent).not.toContain('Texto financeiro privado')
    expect(host.textContent).not.toContain('12.345,67')
    expect(host.querySelector('.top')?.textContent).not.toContain(
      'Novo processo',
    )
  })

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

  it('closes the private edit snapshot and clears resource caches when saving is forbidden', async () => {
    records[0] = makeProcessTestResource({
      obs: 'Observação restrita antes da revogação',
      custo: '19999.89',
    })
    vi.spyOn(processService, 'update').mockRejectedValue(httpError(403))
    await render('/processos/process-1')
    await act(async () => button('Editar').click())
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog).not.toBeNull()
    expect(
      [
        ...dialog.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          'input,textarea',
        ),
      ].some(
        (input) => input.value === 'Observação restrita antes da revogação',
      ),
    ).toBe(true)
    client.setQueryData(
      processQueryKeys.list(scope, { status: ['andamento'] }),
      {
        count: 1,
        next: null,
        previous: null,
        results: [summary(records[0]!)],
      },
    )
    client.setQueryData(processQueryKeys.report(scope, '2026-10'), {
      gain: '19999.89',
    })
    await changeFormValue(
      'Edição recusada pelo servidor',
      '[role="dialog"] textarea[id$="-obs"]',
    )
    await submitForm()
    await waitFor(
      () =>
        host
          .querySelector('main')
          ?.textContent?.includes('Processo indisponível') ?? false,
    )
    expect(processService.update).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(host.textContent).not.toContain(
      'Observação restrita antes da revogação',
    )
    expect(host.textContent).not.toContain('19.999,89')
    expect(
      client.getQueryData(processQueryKeys.detail(scope, 'process-1')),
    ).toBeUndefined()
    expect(
      client
        .getQueryCache()
        .findAll({ queryKey: processQueryKeys.entries(scope, 'process-1') }),
    ).toHaveLength(0)
    expect(
      client
        .getQueryCache()
        .findAll({ queryKey: processQueryKeys.list(scope) })
        .every((query) => query.state.data === undefined),
    ).toBe(true)
    expect(
      client.getQueryData(processQueryKeys.report(scope, '2026-10')),
    ).toBeUndefined()
    await settle()
    expect(host.querySelector('main')?.textContent).toContain(
      'Processo indisponível',
    )
    expect(processService.get).toHaveBeenCalledTimes(1)
  })

  it('retains the parent denial notice after an entries 403 without restoring detail data or looping requests', async () => {
    records[0] = makeProcessTestResource({
      obs: 'Conteúdo privado antes do histórico negar acesso',
    })
    const notesKey = processQueryKeys.entries(scope, 'process-1', {
      kind: 'note',
      page: 1,
      pageSize: 50,
    })
    client.setQueryData(notesKey, {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 'private-note',
          por: 'member-1',
          autor: 'Ana Silva',
          em: '2026-10-29T12:00:00-03:00',
          kind: 'note',
          financial: true,
          text: 'Comentário financeiro anteriormente autorizado',
          details: {},
        },
      ],
    })
    client.setQueryData(processQueryKeys.report(scope, '2026-10'), {
      gain: '99999.00',
    })
    await render('/processos/process-1')
    expect(host.textContent).toContain(
      'Comentário financeiro anteriormente autorizado',
    )
    expect(processService.entries).not.toHaveBeenCalled()
    vi.mocked(processService.entries).mockRejectedValue(httpError(403))
    await act(async () => {
      await client.invalidateQueries({ queryKey: notesKey })
    })
    await waitFor(
      () =>
        host
          .querySelector('main')
          ?.textContent?.includes('Processo indisponível') ?? false,
    )
    expect(host.textContent).not.toContain(
      'Conteúdo privado antes do histórico negar acesso',
    )
    expect(host.textContent).not.toContain(
      'Comentário financeiro anteriormente autorizado',
    )
    expect(
      client.getQueryData(processQueryKeys.detail(scope, 'process-1')),
    ).toBeUndefined()
    expect(
      client
        .getQueryCache()
        .findAll({ queryKey: processQueryKeys.entries(scope, 'process-1') }),
    ).toHaveLength(0)
    expect(
      client.getQueryData(processQueryKeys.report(scope, '2026-10')),
    ).toBeUndefined()
    await settle()
    expect(host.querySelector('main [role="alert"]')).not.toBeNull()
    expect(host.querySelector('main')?.textContent).toContain(
      'Processo indisponível',
    )
    expect(processService.entries).toHaveBeenCalledTimes(1)
    expect(processService.get).toHaveBeenCalledTimes(1)
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

  it('requests an executable queue separately and keeps scheduled processes outside it', async () => {
    records.push(
      makeProcessTestResource({
        id: 'waiting',
        empresa: 'Empresa Agendada',
        status: 'agendado',
        responsibleSectors: ['com'],
        analysis: {
          currentStage: 0,
          completedTasks: 0,
          totalTasks: 4,
          waiting: true,
          late: false,
          releaseDate: '2027-02-22',
          pendingSectors: [],
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
    expect(processService.list).toHaveBeenCalledWith(
      expect.objectContaining({ queueSector: 'com', page: 1, pageSize: 50 }),
      expect.any(AbortSignal),
    )
  })

  it('repeats an unconfirmed opening with exactly the same idempotency key and payload', async () => {
    const create = vi
      .spyOn(processService, 'create')
      .mockRejectedValueOnce(new Error('Conexão interrompida'))
      .mockResolvedValueOnce(response(records[0]!))
    await render('/processos?tipo=abertura')
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>('button[aria-label="Novo processo"]')!
        .click(),
    )
    await waitFor(
      () =>
        document.querySelector<HTMLButtonElement>('.company-option') !== null,
    )
    await act(async () =>
      document.querySelector<HTMLButtonElement>('.company-option')!.click(),
    )
    await submitForm()
    expect(
      document.querySelector('[role="dialog"] [role="status"]')?.textContent,
    ).toContain('sem duplicar')
    await submitForm()
    expect(create).toHaveBeenCalledTimes(2)
    expect(create.mock.calls[0]).toEqual(create.mock.calls[1])
    expect(create.mock.calls[0]?.[1]).toMatch(/^[\w-]{36}$/)
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      companyId: '00000000-0000-4000-8000-000000000001',
      empresa: 'Empresa Nova',
    })
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
    await changeFormValue('Meu ajuste', '[role="dialog"] textarea[id$="-obs"]')
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
      obs: 'Meu ajuste',
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(host.querySelector('main')?.textContent).toContain(
      'Ajuste da equipe',
    )
  })
})
