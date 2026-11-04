/** @vitest-environment happy-dom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeProcessTestResource } from '../components/processes/processTestFixtures'
import { processQueryKeys } from '../query/processQueryKeys'
import { ProcessContractError } from '../services/processContract'
import { processService } from '../services/processService'
import type { ApiResponse } from '../services/httpClient'
import type {
  ProcessFilters,
  ProcessPage,
  ProcessResource,
  ProcessSummary,
} from '../types/processes'
import { useProcessDetail, useProcessList } from './useProcessQueries'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const scope = { organizationId: 'org-1', membershipId: 'member-1' }
let root: Root
let host: HTMLDivElement
let client: QueryClient
let latest: {
  list: ReturnType<typeof useProcessList>
  detail: ReturnType<typeof useProcessDetail>
}

function Probe({
  detailEnabled = false,
  listEnabled = true,
  filters = {},
}: {
  detailEnabled?: boolean
  listEnabled?: boolean
  filters?: ProcessFilters
}) {
  const list = useProcessList(scope, filters, listEnabled)
  const detail = useProcessDetail(scope, 'process-1', detailEnabled)
  useEffect(() => {
    latest = { list, detail }
  }, [list, detail])
  return (
    <output>
      {detail.error?.message ??
        list.error?.message ??
        detail.data?.status ??
        list.status}
    </output>
  )
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  client.clear()
  host.remove()
  vi.restoreAllMocks()
})

function response<T>(data: T, requestId: string): ApiResponse<T> {
  return { data, requestId, etag: null, status: 200, headers: new Headers() }
}
function summary(overrides: Partial<ProcessResource> = {}): ProcessSummary {
  const detail = makeProcessTestResource(overrides)
  const fields = [
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
  ] as const
  return Object.fromEntries(
    fields.map((key) => [key, detail[key]]),
  ) as unknown as ProcessSummary
}
function page(results: ProcessSummary[]): ProcessPage {
  return { count: results.length, next: null, previous: null, results }
}
async function render(props: Parameters<typeof Probe>[0] = {}) {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <Probe {...props} />
      </QueryClientProvider>,
    )
  })
}
async function waitFor(check: () => boolean) {
  const deadline = Date.now() + 2000
  while (!check()) {
    if (Date.now() >= deadline)
      throw new Error(`Unexpected query state: ${host.textContent}`)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
}

describe('Process queries contract diagnostics', () => {
  it('recusa status divergente na mesma versão com IDs de ambas as respostas sem fundir caches', async () => {
    vi.spyOn(processService, 'list').mockResolvedValue(
      response(
        page([summary({ status: 'agendado', version: 4 })]),
        'list-request-42',
      ),
    )
    const get = vi
      .spyOn(processService, 'get')
      .mockResolvedValue(
        response(
          makeProcessTestResource({ status: 'andamento', version: 4 }),
          'detail-request-43',
        ),
      )
    await render()
    await waitFor(() => latest.list.isSuccess)
    await render({ detailEnabled: true })
    await waitFor(() => latest.detail.isError)
    expect(latest.detail.error).toBeInstanceOf(ProcessContractError)
    expect(latest.detail.error?.message).toContain('mesma versão 4')
    expect(host.textContent).toContain('list-request-42')
    expect(host.textContent).toContain('detail-request-43')
    expect(
      client.getQueryData(processQueryKeys.detail(scope, 'process-1')),
    ).toBeUndefined()
    expect(
      client.getQueryData<ProcessPage>(processQueryKeys.list(scope, {}))
        ?.results[0]?.status,
    ).toBe('agendado')
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('aceita outra versão do detalhe e conserva a página recebida até sua invalidação', async () => {
    vi.spyOn(processService, 'list').mockResolvedValue(
      response(page([summary({ status: 'agendado', version: 4 })]), 'list-old'),
    )
    vi.spyOn(processService, 'get').mockResolvedValue(
      response(
        makeProcessTestResource({ status: 'andamento', version: 5 }),
        'detail-new',
      ),
    )
    await render()
    await waitFor(() => latest.list.isSuccess)
    await render({ detailEnabled: true })
    await waitFor(() => latest.detail.isSuccess)
    expect(latest.detail.data?.version).toBe(5)
    expect(
      client.getQueryData<ProcessPage>(processQueryKeys.list(scope, {}))
        ?.results[0]?.status,
    ).toBe('agendado')
  })

  it('rejeita toda a página se qualquer resumo pertencer a outra organização', async () => {
    vi.spyOn(processService, 'list').mockResolvedValue(
      response(
        page([
          summary(),
          summary({ id: 'other-tenant', organizationId: 'org-2' }),
        ]),
        'wrong-list-tenant',
      ),
    )
    await render()
    await waitFor(() => latest.list.isError)
    expect(latest.list.error).toMatchObject({
      name: 'ProcessContractError',
      requestId: 'wrong-list-tenant',
    })
    expect(latest.list.error?.message).toContain('organizationId')
    expect(
      client.getQueryData(processQueryKeys.list(scope, {})),
    ).toBeUndefined()
  })

  it('rejeita detalhe de outra organização antes de armazenar conteúdo financeiro', async () => {
    vi.spyOn(processService, 'get').mockResolvedValue(
      response(
        makeProcessTestResource({
          organizationId: 'org-2',
          honorario: '1000.00',
        }),
        'wrong-detail-tenant',
      ),
    )
    await render({ detailEnabled: true, listEnabled: false })
    await waitFor(() => latest.detail.isError)
    expect(latest.detail.error).toMatchObject({
      name: 'ProcessContractError',
      requestId: 'wrong-detail-tenant',
    })
    expect(
      client.getQueryData(processQueryKeys.detail(scope, 'process-1')),
    ).toBeUndefined()
  })

  it('rejeita detalhe de outro processo retornado para o ID solicitado', async () => {
    vi.spyOn(processService, 'get').mockResolvedValue(
      response(
        makeProcessTestResource({ id: 'process-2' }),
        'wrong-process-id',
      ),
    )
    await render({ detailEnabled: true, listEnabled: false })
    await waitFor(() => latest.detail.isError)
    expect(latest.detail.error).toMatchObject({
      name: 'ProcessContractError',
      requestId: 'wrong-process-id',
    })
    expect(
      client.getQueryData(processQueryKeys.detail(scope, 'process-1')),
    ).toBeUndefined()
  })

  it('permite detalhe ausente da página filtrada sem reconstruir a coleção', async () => {
    vi.spyOn(processService, 'list').mockResolvedValue(
      response(page([]), 'empty-filtered-list'),
    )
    vi.spyOn(processService, 'get').mockResolvedValue(
      response(makeProcessTestResource(), 'detail-outside-page'),
    )
    await render({ filters: { status: ['cancelado'], page: 3 } })
    await waitFor(() => latest.list.isSuccess)
    await render({
      detailEnabled: true,
      filters: { status: ['cancelado'], page: 3 },
    })
    await waitFor(() => latest.detail.isSuccess)
    expect(latest.list.data?.results).toEqual([])
    expect(latest.detail.data?.id).toBe('process-1')
  })

  it('diagnostica divergência em qualquer página cacheada do mesmo escopo', async () => {
    vi.spyOn(processService, 'list')
      .mockResolvedValueOnce(
        response(page([summary({ status: 'agendado' })]), 'list-page-2'),
      )
      .mockResolvedValueOnce(response(page([]), 'list-page-3'))
    vi.spyOn(processService, 'get').mockResolvedValue(
      response(
        makeProcessTestResource({ status: 'andamento' }),
        'detail-after-page-3',
      ),
    )
    await render({ filters: { page: 2 } })
    await waitFor(() => latest.list.isSuccess)
    await render({ filters: { page: 3 } })
    await waitFor(
      () => latest.list.isSuccess && latest.list.data?.results.length === 0,
    )
    await render({ filters: { page: 3 }, detailEnabled: true })
    await waitFor(() => latest.detail.isError)
    expect(latest.detail.error?.message).toContain('list-page-2')
  })

  it('ignora resumos cacheados sob outro tenant ou membership', async () => {
    client.setQueryData(
      processQueryKeys.list({ ...scope, organizationId: 'org-2' }, {}),
      page([summary({ status: 'agendado' })]),
    )
    client.setQueryData(
      processQueryKeys.list({ ...scope, membershipId: 'member-2' }, {}),
      page([summary({ status: 'cancelado' })]),
    )
    vi.spyOn(processService, 'get').mockResolvedValue(
      response(
        makeProcessTestResource({ status: 'andamento' }),
        'detail-current-scope',
      ),
    )
    await render({ detailEnabled: true, listEnabled: false })
    await waitFor(() => latest.detail.isSuccess)
    expect(latest.detail.data?.status).toBe('andamento')
  })
})
