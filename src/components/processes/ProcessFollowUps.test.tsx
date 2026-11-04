/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, type ApiResponse } from '../../services/httpClient'
import { processService } from '../../services/processService'
import { processQueryKeys } from '../../query/processQueryKeys'
import type {
  ProcessFollowUp,
  ProcessPermissions,
  ProcessSector,
} from '../../types/processes'
import ProcessFollowUps from './ProcessFollowUps'
import { processTestPermissions } from './processTestFixtures'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const scope = { organizationId: 'org-1', membershipId: 'member-1' }
const processId = '10101010-1010-4010-8010-101010101010'
const item: ProcessFollowUp = {
  id: '20202020-2020-4020-8020-202020202020',
  processId,
  empresa: 'Empresa de demonstração',
  sendTaskId: 'ab4',
  returnTaskId: 'ab5',
  sentAt: '2026-10-25T12:00:00Z',
  dueOn: '2026-11-01',
  createdAt: '2026-11-01T12:00:00Z',
  state: 'pending',
  completedAt: null,
  completedBy: null,
  resolvedAt: null,
  resolution: '',
  version: 3,
}
const response = <T,>(data: T): ApiResponse<T> => ({
  data,
  status: 200,
  headers: new Headers(),
  etag: null,
  requestId: null,
})
const page = (results = [item]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
})
function failure(status: number) {
  return new ApiError({
    problem: { type: 'failure', title: 'Falha na operação', status },
    requestId: 'followup-error',
    response: new Response(null, { status }),
  })
}
let root: Root
let host: HTMLDivElement
let client: QueryClient
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  vi.spyOn(processService, 'followUps').mockResolvedValue(response(page()))
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.restoreAllMocks()
})
async function render(
  permissions: ProcessPermissions = processTestPermissions,
  detail = false,
  currentScope = scope,
  onUnavailable = vi.fn(),
) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <ProcessFollowUps
          scope={currentScope}
          permissions={permissions}
          processId={detail ? processId : undefined}
          onUnavailable={onUnavailable}
        />
      </QueryClientProvider>,
    ),
  )
  await settle()
}
async function settle() {
  await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))
}
function button(text: string) {
  return [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (value) => value.textContent?.trim() === text,
  )
}

describe('ProcessFollowUps', () => {
  it.each([
    ['com', ['com', 'fin', 'reg']],
    ['fin', ['fin']],
    ['reg', ['reg']],
  ] as [ProcessSector, ProcessSector[]][])(
    'allows %s to read and only financial executors to record',
    async (sector, executeSectors) => {
      const complete = vi
        .spyOn(processService, 'completeFollowUp')
        .mockResolvedValue(
          response({
            ...item,
            state: 'completed',
            completedAt: '2026-11-03T12:00:00Z',
            completedBy: 'Ana Silva',
            version: 4,
          }),
        )
      const transition = vi.spyOn(processService, 'transitionTask')
      await render({
        ...processTestPermissions,
        sectors: [sector],
        executeSectors,
      })
      expect(host.textContent).toContain(item.empresa)
      expect(!!button('Registrar cobrança realizada')).toBe(
        executeSectors.includes('fin'),
      )
      if (executeSectors.includes('fin')) {
        await act(async () => button('Registrar cobrança realizada')!.click())
        expect(complete).toHaveBeenCalledWith(item.id, 3)
        expect(host.textContent).toContain(
          'O retorno da Leggacy continua sendo acompanhado',
        )
      }
      expect(transition).not.toHaveBeenCalled()
    },
  )

  it('keeps completed actor and time when a previous cycle is subsequently resolved', async () => {
    vi.mocked(processService.followUps).mockResolvedValue(
      response(
        page([
          {
            ...item,
            state: 'resolved',
            completedAt: '2026-11-02T12:00:00Z',
            completedBy: 'Ana Silva',
            resolvedAt: '2026-11-03T12:00:00Z',
            resolution: 'return_or_reset',
          },
        ]),
      ),
    )
    await render(processTestPermissions, true)
    const filter = host.querySelector('select')!
    await act(async () => {
      filter.value = ''
      filter.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await settle()
    expect(processService.followUps).toHaveBeenLastCalledWith(
      expect.objectContaining({ processId, state: undefined, page: 1 }),
      expect.any(AbortSignal),
    )
    expect(host.textContent).toContain('Cobrança realizada por Ana Silva')
    expect(host.textContent).toContain('02/11/2026')
    expect(host.textContent).toContain('Encerrada em')
    expect(host.textContent).toContain('03/11/2026')
    expect(button('Registrar cobrança realizada')).toBeUndefined()
  })

  it('uses server pagination and count without fetching remaining pages eagerly', async () => {
    vi.mocked(processService.followUps).mockResolvedValueOnce(
      response({
        ...page(),
        count: 51,
        next: '/api/v1/process-follow-ups/?page=2',
      }),
    )
    await render()
    expect(processService.followUps).toHaveBeenCalledTimes(1)
    expect(host.textContent).toContain('Página 1 · 51 cobranças')
    await act(async () => button('Próxima')!.click())
    await settle()
    expect(processService.followUps).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, pageSize: 50, state: 'pending' }),
      expect.any(AbortSignal),
    )
    expect(processService.followUps).toHaveBeenCalledTimes(2)
  })

  it('refreshes after a version conflict and requires another explicit action', async () => {
    const complete = vi
      .spyOn(processService, 'completeFollowUp')
      .mockRejectedValue(failure(409))
    await render()
    vi.mocked(processService.followUps).mockResolvedValue(
      response(page([{ ...item, version: 4 }])),
    )
    await act(async () => button('Registrar cobrança realizada')!.click())
    await settle()
    expect(complete).toHaveBeenCalledTimes(1)
    expect(host.textContent).toContain(
      'Confira os dados atualizados antes de registrar novamente',
    )
    await act(async () => button('Registrar cobrança realizada')!.click())
    expect(complete).toHaveBeenLastCalledWith(item.id, 4)
  })

  it('removes restricted data and actions when access is revoked', async () => {
    vi.spyOn(processService, 'completeFollowUp').mockRejectedValue(failure(403))
    const unavailable = vi.fn()
    await render(processTestPermissions, false, scope, unavailable)
    await act(async () => button('Registrar cobrança realizada')!.click())
    expect(unavailable).toHaveBeenCalledTimes(1)
    expect(host.textContent).not.toContain(item.empresa)
    expect(button('Registrar cobrança realizada')).toBeUndefined()
    expect(
      client
        .getQueriesData({ queryKey: processQueryKeys.followUps(scope) })
        .every(([, value]) => value === undefined),
    ).toBe(true)
  })

  it('shows a loading failure instead of reporting an empty queue', async () => {
    vi.mocked(processService.followUps).mockRejectedValue(failure(503))
    await render()
    expect(host.textContent).toContain('Não foi possível carregar as cobranças')
    expect(host.textContent).not.toContain('Nenhuma cobrança pendente')
  })

  it('preserves previous cycles with the same workflow task identifiers', async () => {
    const previous: ProcessFollowUp = {
      ...item,
      id: '30303030-3030-4030-8030-303030303030',
      state: 'resolved',
      sentAt: '2026-09-01T12:00:00Z',
      completedAt: '2026-09-08T12:00:00Z',
      completedBy: 'Ana Silva',
      resolvedAt: '2026-09-09T12:00:00Z',
      resolution: 'return_or_reset',
    }
    vi.mocked(processService.followUps).mockResolvedValue(
      response(page([previous, item])),
    )
    await render(processTestPermissions, true)
    const filter = host.querySelector('select')!
    await act(async () => {
      filter.value = ''
      filter.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await settle()
    expect(host.querySelectorAll('.process-followup')).toHaveLength(2)
    expect(host.textContent).toContain('Cobrança realizada por Ana Silva')
    expect(host.textContent).toContain('Cobrança pendente')
    expect(button('Registrar cobrança realizada')).toBeDefined()
  })

  it('blocks replay for the server Retry-After period', async () => {
    const complete = vi
      .spyOn(processService, 'completeFollowUp')
      .mockRejectedValue(
        new ApiError({
          problem: {
            type: 'throttled',
            title: 'Muitas requisições',
            status: 429,
          },
          requestId: 'followup-throttled',
          response: new Response(null, {
            status: 429,
            headers: { 'Retry-After': '30' },
          }),
        }),
      )
    await render()
    await act(async () => button('Registrar cobrança realizada')!.click())
    expect(button('Registrar cobrança realizada')?.disabled).toBe(true)
    await act(async () => button('Registrar cobrança realizada')!.click())
    expect(complete).toHaveBeenCalledTimes(1)
    expect(host.textContent).toContain('Aguarde 30 segundos')
    expect(host.textContent).toContain('followup-throttled')
  })

  it('does not expose the previous tenant queue while the new tenant loads', async () => {
    await render()
    expect(host.textContent).toContain(item.empresa)
    vi.mocked(processService.followUps).mockImplementation(
      () => new Promise(() => {}),
    )
    await render(processTestPermissions, false, {
      organizationId: 'org-2',
      membershipId: 'member-2',
    })
    expect(host.textContent).not.toContain(item.empresa)
    expect(host.textContent).toContain('Carregando cobranças')
  })
})
