/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { processQueryKeys } from '../../query/processQueryKeys'
import { ApiError, type ApiResponse } from '../../services/httpClient'
import { processService } from '../../services/processService'
import type {
  ProcessMonthlyReport,
  ProcessMovementMonth,
} from '../../types/processes'
import ProcessMovements from './ProcessMovements'
import { processTestCatalog } from './processTestFixtures'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const scope = { organizationId: 'org-1', membershipId: 'member-1' }
let root: Root
let host: HTMLDivElement
let client: QueryClient

const movement: ProcessMovementMonth = {
  month: '2026-10',
  gain: '1250.00',
  loss: '0.00',
  balance: '1250.00',
  missingValues: 0,
  entries: [
    {
      processId: 'private-process',
      empresa: 'Cliente Confidencial',
      tipo: 'abertura',
      value: '1250.00',
    },
  ],
  exits: [],
  lossesByType: {},
}
const report: ProcessMonthlyReport = {
  ...movement,
  previousMonth: { ...movement, month: '2026-09' },
  history: [movement],
}
function response(): ApiResponse<ProcessMonthlyReport> {
  return {
    data: report,
    status: 200,
    headers: new Headers(),
    etag: null,
    requestId: null,
  }
}
function failure(status: number) {
  return new ApiError({
    problem: { type: 'report-failure', title: 'Falha na consulta', status },
    requestId: 'report-request',
    response: new Response(null, { status, headers: { 'Retry-After': '5' } }),
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-29T15:00:00Z'))
  host = document.createElement('div')
  host.id = 'root'
  document.body.append(host)
  root = createRoot(host)
  client = new QueryClient({
    defaultOptions: { queries: { retry: true, gcTime: Infinity } },
  })
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  vi.useRealTimers()
  vi.restoreAllMocks()
})
async function render(onUnavailable = vi.fn()) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <ProcessMovements
          scope={scope}
          catalog={processTestCatalog}
          month="2026-10"
          authorName="Ana"
          onMonth={vi.fn()}
          onOpen={vi.fn()}
          onUnavailable={onUnavailable}
        />
      </QueryClientProvider>,
    ),
  )
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10)
  })
  return onUnavailable
}

describe('ProcessMovements query lifecycle', () => {
  it('renders reactivation and fee adjustments using only the API totals', async () => {
    const data: ProcessMonthlyReport = {
      ...report,
      gain: '500.00',
      loss: '100.00',
      balance: '400.00',
      entries: [
        {
          processId: 'reactivation',
          empresa: 'Cliente reativado',
          tipo: 'reativacao',
          value: '350.00',
        },
        {
          processId: 'increase',
          empresa: 'Cliente com aumento',
          tipo: 'aumento_honorarios',
          value: '150.00',
        },
      ],
      exits: [
        {
          processId: 'reduction',
          empresa: 'Cliente com redução',
          tipo: 'reducao_honorarios',
          value: '100.00',
        },
      ],
      lossesByType: { reducao_honorarios: '100.00' },
    }
    vi.spyOn(processService, 'monthlyReport').mockResolvedValue({
      ...response(),
      data,
    })
    await render()
    const cards = host.querySelector('.scards')!.textContent!
    for (const value of ['500,00', '100,00', '400,00'])
      expect(cards).toContain(value)
    expect(host.textContent).toContain('2 movimentações de ganho')
    expect(host.textContent).toContain('reativações')
    expect(host.textContent).toContain('aumentos de honorários')
    expect(host.textContent).toContain('reduções de honorários')
    expect(host.textContent).not.toContain('contratos novos')
    expect(
      client.getQueryData(processQueryKeys.report(scope, '2026-10')),
    ).toEqual(data)
  })
  it.each([403, 404])(
    'purges reports and retains a visible denial on HTTP %i without refetch loops',
    async (status) => {
      const error = failure(status)
      const fetch = vi
        .spyOn(processService, 'monthlyReport')
        .mockRejectedValue(error)
      client.setQueryData(processQueryKeys.report(scope, '2026-10'), report)
      client.setQueryData(processQueryKeys.report(scope, '2026-09'), report)
      const onUnavailable = await render()
      expect(onUnavailable).toHaveBeenCalledWith(error)
      expect(host.querySelector('[role="alert"]')?.textContent).toContain(
        'report-request',
      )
      expect(host.textContent).not.toContain('Cliente Confidencial')
      expect(host.textContent).not.toContain('Carregando movimentações')
      expect(
        client
          .getQueriesData({
            queryKey: processQueryKeys.report(scope, '').slice(0, -1),
          })
          .every(([, data]) => data === undefined),
      ).toBe(true)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000)
      })
      expect(fetch).toHaveBeenCalledTimes(1)
    },
  )

  it('hides stale financial data and an open report after HTTP 503, then respects Retry-After', async () => {
    const fetch = vi
      .spyOn(processService, 'monthlyReport')
      .mockResolvedValue(response())
    await render()
    expect(host.textContent).toContain('Cliente Confidencial')
    const openReport = [
      ...host.querySelectorAll<HTMLButtonElement>('button'),
    ].find((button) => button.textContent?.includes('Relatório do mês'))!
    await act(async () => openReport.click())
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    fetch.mockRejectedValue(failure(503))
    await act(async () => {
      await client.refetchQueries({
        queryKey: processQueryKeys.report(scope, '2026-10'),
      })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'indisponível temporariamente',
    )
    expect(host.textContent).not.toContain('Cliente Confidencial')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    const retry = host.querySelector<HTMLButtonElement>(
      '[role="alert"] button',
    )!
    expect(retry.disabled).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(2)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(retry.disabled).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(2)
    fetch.mockResolvedValue(response())
    await act(async () => retry.click())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(host.textContent).toContain('Cliente Confidencial')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
})
