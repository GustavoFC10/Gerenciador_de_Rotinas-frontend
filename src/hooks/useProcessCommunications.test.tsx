/** @vitest-environment happy-dom */
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { processQueryKeys } from '../query/processQueryKeys'
import type { OrganizationQueryScope } from '../query/queryKeys'
import { ApiError, type ApiResponse } from '../services/httpClient'
import { ProcessContractError } from '../services/processContract'
import { processService } from '../services/processService'
import type {
  ProcessAlert,
  ProcessAlertFilters,
  ProcessAlertRecipientFilters,
  ProcessFollowUp,
  ProcessFollowUpFilters,
} from '../types/processes'
import {
  useProcessAlert,
  useProcessAlerts,
  useProcessAlertRecipientOptions,
  useProcessFollowUps,
} from './useProcessCommunications'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const scope = { organizationId: 'org-1', membershipId: 'member-1' }
const alertId = '00000000-0000-4000-8000-000000000001'
const processId = '00000000-0000-4000-8000-000000000002'
const memberId = '00000000-0000-4000-8000-000000000003'
const anotherId = '00000000-0000-4000-8000-000000000004'
const alert: ProcessAlert = {
  id: alertId,
  processId,
  empresa: 'Empresa Exemplo',
  codigo: 'ABE-TEST',
  kind: 'leggacy',
  followUpId: null,
  stageIndex: null,
  subject: 'Assunto',
  body: 'Mensagem',
  defaultSectors: ['com', 'fin'],
  selectedSectors: [],
  selectedMemberIds: [],
  recipients: [],
  createdAt: '2026-11-03T12:00:00Z',
  sentAt: null,
  sentBy: null,
  resolvedAt: null,
  status: 'pending',
  deliveryMode: 'manual',
  version: 4,
}
const followUp: ProcessFollowUp = {
  id: anotherId,
  processId,
  empresa: 'Empresa Exemplo',
  sendTaskId: 'ab4',
  returnTaskId: 'ab5',
  sentAt: '2026-10-27T12:00:00Z',
  dueOn: '2026-11-03',
  createdAt: '2026-11-03T12:00:00Z',
  state: 'pending',
  completedAt: null,
  completedBy: null,
  resolvedAt: null,
  resolution: '',
  version: 2,
}
const response = <T,>(data: T): ApiResponse<T> => ({
  data,
  status: 200,
  requestId: 'communications-request',
  etag: null,
  headers: new Headers(),
})
function page<T>(item: T) {
  return { count: 81, next: '?page=2', previous: null, results: [item] }
}
type Mode = 'all' | 'followUps' | 'alerts' | 'alert' | 'recipients'
interface ProbeProps {
  scope?: OrganizationQueryScope
  mode?: Mode
  enabled?: boolean
  alertId?: string
  followUpFilters?: ProcessFollowUpFilters
  alertFilters?: ProcessAlertFilters
  recipientFilters?: ProcessAlertRecipientFilters
}
let latest: {
  followUps: ReturnType<typeof useProcessFollowUps>
  alerts: ReturnType<typeof useProcessAlerts>
  alert: ReturnType<typeof useProcessAlert>
  recipients: ReturnType<typeof useProcessAlertRecipientOptions>
}
let root: Root
let host: HTMLDivElement
let client: QueryClient
function Probe({
  scope: activeScope = scope,
  mode = 'all',
  enabled = true,
  alertId: id = alertId,
  followUpFilters = {},
  alertFilters = {},
  recipientFilters = {},
}: ProbeProps) {
  const active = (name: Mode) => enabled && (mode === 'all' || mode === name)
  const followUps = useProcessFollowUps(
    activeScope,
    followUpFilters,
    active('followUps'),
  )
  const alerts = useProcessAlerts(activeScope, alertFilters, active('alerts'))
  const detail = useProcessAlert(activeScope, id, active('alert'))
  const recipients = useProcessAlertRecipientOptions(
    activeScope,
    recipientFilters,
    active('recipients'),
  )
  useEffect(() => {
    latest = { followUps, alerts, alert: detail, recipients }
  }, [followUps, alerts, detail, recipients])
  return (
    <output>
      {[followUps, alerts, detail, recipients]
        .map((query) =>
          query.error instanceof Error ? query.error.message : query.status,
        )
        .join(' · ')}
    </output>
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-03T12:00:00Z'))
  focusManager.setFocused(true)
  // Hook-specific retry=false must override an application-level retry policy.
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: true, retryDelay: 10, gcTime: Infinity, staleTime: 0 },
    },
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  vi.spyOn(processService, 'followUps').mockResolvedValue(
    response(page(followUp)),
  )
  vi.spyOn(processService, 'alerts').mockResolvedValue(response(page(alert)))
  vi.spyOn(processService, 'alert').mockResolvedValue(response(alert))
  vi.spyOn(processService, 'alertRecipientOptions').mockResolvedValue(
    response(
      page({
        memberId,
        name: 'Ana Silva',
        email: 'ana@example.test',
        sectors: ['fin'],
      }),
    ),
  )
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  host.remove()
  focusManager.setFocused(undefined)
  vi.restoreAllMocks()
  vi.useRealTimers()
})
async function tick(milliseconds = 10) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds)
  })
}
async function render(props: ProbeProps = {}) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Probe {...props} />
      </QueryClientProvider>,
    ),
  )
  await tick()
}
function calls() {
  return [
    processService.followUps,
    processService.alerts,
    processService.alert,
    processService.alertRecipientOptions,
  ].map((method) => vi.mocked(method).mock.calls.length)
}

describe('queries de cobranças e avisos', () => {
  it('consulta somente a página solicitada e conserva count global sem percorrer next', async () => {
    const followUpFilters: ProcessFollowUpFilters = {
      processId,
      state: 'pending',
      page: 2,
      pageSize: 50,
    }
    const alertFilters: ProcessAlertFilters = {
      status: 'pending',
      kind: 'leggacy',
      page: 3,
      pageSize: 1,
    }
    const recipientFilters: ProcessAlertRecipientFilters = {
      q: 'Ana',
      sector: 'fin',
      page: 2,
      pageSize: 50,
    }
    await render({ followUpFilters, alertFilters, recipientFilters })
    expect(calls()).toEqual([1, 1, 1, 1])
    expect(processService.followUps).toHaveBeenCalledWith(
      followUpFilters,
      expect.any(AbortSignal),
    )
    expect(processService.alerts).toHaveBeenCalledWith(
      alertFilters,
      expect.any(AbortSignal),
    )
    expect(processService.alertRecipientOptions).toHaveBeenCalledWith(
      recipientFilters,
      expect.any(AbortSignal),
    )
    expect(latest.followUps.data).toMatchObject({
      count: 81,
      next: '?page=2',
      results: [followUp],
    })
    expect(latest.alerts.data?.count).toBe(81)
    expect(latest.recipients.data?.count).toBe(81)
    await tick(500)
    expect(calls()).toEqual([1, 1, 1, 1])
  })

  it('isola cache de organização e membership mesmo para os mesmos IDs e filtros', async () => {
    await render()
    const scopes = [
      scope,
      { ...scope, organizationId: 'org-2' },
      { organizationId: 'org-2', membershipId: 'member-2' },
    ]
    await render({ scope: scopes[1] })
    await render({ scope: scopes[2] })
    expect(calls()).toEqual([3, 3, 3, 3])
    for (const isolated of scopes) {
      expect(
        client.getQueryData(processQueryKeys.followUps(isolated, {})),
      ).toMatchObject({ count: 81 })
      expect(
        client.getQueryData(processQueryKeys.alerts(isolated, {})),
      ).toMatchObject({ count: 81 })
      expect(
        client.getQueryData(processQueryKeys.alert(isolated, alertId)),
      ).toMatchObject({ id: alertId })
      expect(
        client.getQueryData(processQueryKeys.alertRecipients(isolated, {})),
      ).toMatchObject({ count: 81 })
    }
    expect(
      new Set(
        scopes.map((isolated) =>
          JSON.stringify(processQueryKeys.alert(isolated, alertId)),
        ),
      ).size,
    ).toBe(3)
  })

  it('usa caches distintos para seleção de filtros e páginas', async () => {
    const first = {
      followUpFilters: { state: 'pending', page: 1 } as ProcessFollowUpFilters,
      alertFilters: {
        status: 'pending',
        kind: 'leggacy',
        page: 1,
      } as ProcessAlertFilters,
      recipientFilters: {
        q: 'Ana',
        sector: 'fin',
        page: 1,
      } as ProcessAlertRecipientFilters,
    }
    const second = {
      followUpFilters: {
        state: 'completed',
        page: 1,
      } as ProcessFollowUpFilters,
      alertFilters: {
        status: 'sent',
        kind: 'overdue',
        page: 1,
      } as ProcessAlertFilters,
      recipientFilters: {
        q: 'João',
        sector: 'reg',
        page: 1,
      } as ProcessAlertRecipientFilters,
    }
    const third = {
      followUpFilters: { ...second.followUpFilters, page: 2 },
      alertFilters: { ...second.alertFilters, page: 2 },
      recipientFilters: { ...second.recipientFilters, page: 2 },
    }
    await render(first)
    await render(second)
    await render(third)
    expect(calls()).toEqual([3, 3, 1, 3])
    for (const filters of [first, second, third]) {
      expect(
        client.getQueryData(
          processQueryKeys.followUps(scope, filters.followUpFilters),
        ),
      ).toBeDefined()
      expect(
        client.getQueryData(
          processQueryKeys.alerts(scope, filters.alertFilters),
        ),
      ).toBeDefined()
      expect(
        client.getQueryData(
          processQueryKeys.alertRecipients(scope, filters.recipientFilters),
        ),
      ).toBeDefined()
    }
  })

  it('não expõe dados do cache anterior enquanto consulta o novo tenant', async () => {
    await render({ mode: 'alerts' })
    let release!: () => void
    vi.mocked(processService.alerts).mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return response(page({ ...alert, empresa: 'Outra organização' }))
    })
    await render({
      mode: 'alerts',
      scope: { organizationId: 'org-2', membershipId: 'member-2' },
    })
    expect(latest.alerts.data).toBeUndefined()
    expect(latest.alerts.isPending).toBe(true)
    await act(async () => release())
    await tick()
    expect(latest.alerts.data?.results[0].empresa).toBe('Outra organização')
    expect(
      client.getQueryData<{ results: ProcessAlert[] }>(
        processQueryKeys.alerts(scope, {}),
      )?.results[0].empresa,
    ).toBe('Empresa Exemplo')
  })

  it('atualiza a cada60s em foco e refaz consulta ao voltar à janela', async () => {
    await render()
    expect(calls()).toEqual([1, 1, 1, 1])
    await tick(59_900)
    expect(calls()).toEqual([1, 1, 1, 1])
    await tick(200)
    expect(calls()).toEqual([2, 2, 2, 2])
    await act(async () => focusManager.setFocused(false))
    await tick(120_000)
    expect(calls()).toEqual([2, 2, 2, 2])
    await act(async () => focusManager.setFocused(true))
    await tick()
    expect(calls()).toEqual([3, 3, 3, 3])
  })

  it.each([429, 503])(
    'para polling, foco e tentativas automáticas após HTTP%i',
    async (status) => {
      const error = new ApiError({
        problem: {
          type: 'test-rate-limit',
          title: 'Serviço indisponível',
          status,
        },
        requestId: 'retry-request',
        response: new Response(null, {
          status,
          headers: { 'Retry-After': '60' },
        }),
      })
      vi.mocked(processService.followUps).mockRejectedValue(error)
      vi.mocked(processService.alerts).mockRejectedValue(error)
      vi.mocked(processService.alert).mockRejectedValue(error)
      vi.mocked(processService.alertRecipientOptions).mockRejectedValue(error)
      await render()
      expect([
        latest.followUps.error,
        latest.alerts.error,
        latest.alert.error,
        latest.recipients.error,
      ]).toEqual([error, error, error, error])
      expect(calls()).toEqual([1, 1, 1, 1])
      await tick(180_000)
      await act(async () => focusManager.setFocused(false))
      await act(async () => focusManager.setFocused(true))
      await tick()
      expect(calls()).toEqual([1, 1, 1, 1])
      expect(host.textContent).toContain('60 segundos')
    },
  )

  it('não consulta endpoints quando a permissão está desabilitada, inclusive após foco e polling', async () => {
    await render({ enabled: false })
    await tick(180_000)
    await act(async () => focusManager.setFocused(false))
    await act(async () => focusManager.setFocused(true))
    await tick()
    expect(calls()).toEqual([0, 0, 0, 0])
    expect([
      latest.followUps.fetchStatus,
      latest.alerts.fetchStatus,
      latest.alert.fetchStatus,
      latest.recipients.fetchStatus,
    ]).toEqual(['idle', 'idle', 'idle', 'idle'])
  })

  it('não consulta detalhe sem ID de aviso', async () => {
    await render({ mode: 'alert', alertId: '' })
    expect(processService.alert).not.toHaveBeenCalled()
    expect(latest.alert.fetchStatus).toBe('idle')
  })

  it('rejeita aviso com ID diferente e conserva requestId no diagnóstico', async () => {
    vi.mocked(processService.alert).mockResolvedValue(
      response({ ...alert, id: anotherId }),
    )
    await render({ mode: 'alert' })
    expect(latest.alert.error).toBeInstanceOf(ProcessContractError)
    expect(latest.alert.error).toMatchObject({
      requestId: 'communications-request',
    })
    expect(latest.alert.error).toMatchObject({
      message: expect.stringContaining('aviso diferente do solicitado'),
    })
    expect(
      client.getQueryData(processQueryKeys.alert(scope, alertId)),
    ).toBeUndefined()
  })

  it.each(['alerts', 'followUps'] as const)(
    'rejeita coleção%s que inclua outro processId',
    async (mode) => {
      const wrongProcessId = anotherId
      await render({
        mode,
        followUpFilters: { processId: wrongProcessId },
        alertFilters: { processId: wrongProcessId },
      })
      const query = latest[mode]
      expect(query.error).toBeInstanceOf(ProcessContractError)
      expect(query.error).toMatchObject({ requestId: 'communications-request' })
      expect(query.error).toMatchObject({
        message: expect.stringContaining('processo diferente do solicitado'),
      })
      expect(query.data).toBeUndefined()
      await tick(180_000)
      expect(vi.mocked(processService[mode])).toHaveBeenCalledTimes(1)
    },
  )
})
