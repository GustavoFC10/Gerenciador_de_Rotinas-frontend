import { describe, expect, it, vi } from 'vitest'
import openapi from '../../openapi.yml?raw'
import {
  makeProcessTestResource,
  processTestCatalog,
} from '../components/processes/processTestFixtures'
import type {
  ProcessAlert,
  ProcessAlertSelection,
  ProcessFollowUp,
} from '../types/processes'
import { HttpClient } from './httpClient'
import {
  normalizeProcessAlertFilters,
  normalizeProcessAlertRecipientFilters,
  normalizeProcessFollowUpFilters,
  parseProcessAlert,
  parseProcessCatalog,
  parseProcessDetail,
  parseProcessFollowUp,
  ProcessContractError,
} from './processContract'
import { ProcessService } from './processService'

const processId = '00000000-0000-4000-8000-000000000001'
const followUpId = '00000000-0000-4000-8000-000000000002'
const alertId = '00000000-0000-4000-8000-000000000003'
const memberId = '00000000-0000-4000-8000-000000000004'
const recipient = { memberId, name: 'Ana', email: 'ana@example.com' }
const followUp: ProcessFollowUp = {
  id: followUpId,
  processId,
  empresa: 'Empresa exemplo',
  sendTaskId: 'ab4',
  returnTaskId: 'ab5',
  sentAt: '2026-10-26T12:00:00Z',
  dueOn: '2026-11-02',
  createdAt: '2026-11-02T12:00:00Z',
  state: 'pending',
  completedAt: null,
  completedBy: null,
  resolvedAt: null,
  resolution: '',
  version: 7,
}
const alert: ProcessAlert = {
  id: alertId,
  processId,
  empresa: 'Empresa exemplo',
  codigo: 'ABE-2610-TEST',
  kind: 'leggacy',
  followUpId,
  stageIndex: null,
  subject: 'Retorno Leggacy',
  body: 'Aguardando retorno.',
  defaultSectors: ['com', 'fin'],
  selectedSectors: [],
  selectedMemberIds: [],
  recipients: [],
  createdAt: '2026-11-02T12:00:00Z',
  sentAt: null,
  sentBy: null,
  resolvedAt: null,
  status: 'pending',
  deliveryMode: 'manual',
  version: 3,
}
const page = <T>(value: T, count = 1) => ({
  count,
  next: null,
  previous: null,
  results: [value],
})
function service(fetchImplementation: typeof fetch) {
  const client = new HttpClient({
    baseUrl: 'https://api.example.com',
    fetchImplementation,
    requestIdFactory: () => 'request-alert',
  })
  client.setCsrfToken('csrf-alert')
  return new ProcessService(client)
}
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': 'response-alert',
    },
  })
}

describe('Cobranças e avisos manuais: contrato e transporte', () => {
  it('corresponde aos novos endpoints e campos obrigatórios no OpenAPI gerado pelo backend', () => {
    for (const endpoint of [
      '/api/v1/process-follow-ups/',
      '/api/v1/process-follow-ups/{id}/',
      '/api/v1/process-follow-ups/{id}/complete/',
      '/api/v1/process-alerts/',
      '/api/v1/process-alerts/{id}/',
      '/api/v1/process-alerts/{id}/prepare/',
      '/api/v1/process-alerts/{id}/declare-sent/',
      '/api/v1/process-alerts/recipient-options/',
    ])
      expect(openapi).toContain(`  ${endpoint}:`)
    for (const [schema, fixture, parse] of [
      ['Alert', alert, parseProcessAlert],
      ['FollowUp', followUp, parseProcessFollowUp],
    ] as const) {
      const block = openapi.match(
        new RegExp(
          `^    ${schema}:\\r?\\n([\\s\\S]*?)(?=^    [A-Za-z0-9_]+:)`,
          'm',
        ),
      )?.[1]
      const required = block?.match(
        /^ {6}required:\r?\n((?: {6}- [^\r\n]+\r?\n)+)/m,
      )?.[1]
      expect(required).toBeTruthy()
      for (const field of [...required!.matchAll(/^ {6}- (.+)$/gm)].map(
        (match) => match[1].trim(),
      )) {
        const incomplete: Record<string, unknown> = { ...fixture }
        delete incomplete[field]
        expect(() => parse(incomplete), `${schema}.${field}`).toThrow(
          ProcessContractError,
        )
      }
    }
  })

  it('mantém workflow do snapshot separado da versão do catálogo e do contrato', () => {
    expect(
      parseProcessCatalog({ ...processTestCatalog, workflowVersion: 2 })
        .contractVersion,
    ).toBe(2)
    const snapshot = makeProcessTestResource({
      workflowVersion: 1,
      leggacy: [],
    })
    expect(parseProcessDetail(snapshot).workflowVersion).toBe(1)
    expect(snapshot.workflowVersion).toBe(1)
  })

  it('aceita apenas a referência mínima de empresa enviada para leitores de Processos', () => {
    const companyReference = {
      id: processId,
      code: 'EMP-1',
      name: 'Empresa',
      legalName: 'Empresa Ltda',
      cnpj: '12345678000190',
      status: 'active' as const,
    }
    const snapshot = makeProcessTestResource({
      companyLinkRequired: false,
      companyReference,
      permissions: {
        ...processTestCatalog.permissions,
        create: false,
        viewFinancial: false,
      },
    })
    expect(parseProcessDetail(snapshot).companyReference).toEqual(
      companyReference,
    )
    expect(() =>
      parseProcessDetail({
        ...snapshot,
        companyReference: { ...companyReference, financialNotes: 'Privado' },
      }),
    ).toThrow(ProcessContractError)
  })

  it.each([
    ['abertura', 'ab4', 'ab5'],
    ['mei', 'me4', 'me5'],
    ['alteracao', 'al3', 'al4'],
    ['reativacao', 're6', 're7'],
    ['baixa', 'ba6', 'ba7'],
  ] as const)(
    'preserva cob e rastreamento no snapshot %s sem inserir tarefas ou calcular dias',
    (tipo, sendTaskId, returnTaskId) => {
      const tracking = {
        sendTaskId,
        returnTaskId,
        sentAt: '2026-10-26T12:00:00Z',
        dueOn: '2026-11-02',
        daysWaiting: 8,
        awaitingReturn: true,
        followUpDue: true,
      }
      const snapshot = makeProcessTestResource({
        tipo,
        workflowVersion: 2,
        leggacy: [tracking],
        etapas: [
          {
            t: 'Leggacy',
            tasks: [
              { id: sendTaskId, d: 'fin', txt: 'Enviar' },
              { id: returnTaskId, d: 'fin', txt: 'Retorno', cob: sendTaskId },
            ],
          },
        ],
      })
      const result = parseProcessDetail(snapshot)
      expect(result.leggacy).toEqual([tracking])
      expect(result.etapas[0].tasks[1].cob).toBe(sendTaskId)
      expect(result.tarefas).toEqual(snapshot.tarefas)
      expect(result.analysis).toEqual(snapshot.analysis)
    },
  )

  it('normaliza filtros e limita cada coleção à página solicitada', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(page(followUp, 140)))
      .mockResolvedValueOnce(json(page(alert, 205)))
      .mockResolvedValueOnce(
        json(page({ ...recipient, sectors: ['fin', 'com'] }, 88)),
      )
    const api = service(fetcher)
    expect(
      (
        await api.followUps({
          processId,
          state: 'pending',
          page: 2,
          pageSize: 50,
        })
      ).data.count,
    ).toBe(140)
    expect(
      (await api.alerts({ kind: 'overdue', status: 'pending', pageSize: 1 }))
        .data.count,
    ).toBe(205)
    expect(
      (await api.alertRecipientOptions({ q: ' Ana ', sector: 'fin', page: 3 }))
        .data.count,
    ).toBe(88)
    const urls = fetcher.mock.calls.map(([url]) => new URL(String(url)))
    expect(urls[0].pathname).toBe('/api/v1/process-follow-ups/')
    expect(urls[0].searchParams.get('processId')).toBe(processId)
    expect(urls[0].searchParams.get('page')).toBe('2')
    expect(urls[1].pathname).toBe('/api/v1/process-alerts/')
    expect(urls[1].searchParams.get('pageSize')).toBe('1')
    expect(urls[2].pathname).toBe('/api/v1/process-alerts/recipient-options/')
    expect(urls[2].searchParams.get('q')).toBe('Ana')
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('busca recursos individuais com cancelamento e preserva versões independentes', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(followUp))
      .mockResolvedValueOnce(json(alert))
    const controller = new AbortController()
    const api = service(fetcher)
    expect(
      (await api.followUp(followUpId, controller.signal)).data.version,
    ).toBe(7)
    expect((await api.alert(alertId, controller.signal)).data.version).toBe(3)
    expect(fetcher.mock.calls[0][1]?.signal).toBe(controller.signal)
    expect(new URL(String(fetcher.mock.calls[1][0])).pathname).toBe(
      `/api/v1/process-alerts/${alertId}/`,
    )
  })

  it.each([
    { sectors: ['fin'] },
    { memberIds: [memberId] },
    { sectors: ['com', 'fin'], memberIds: [memberId] },
  ] as Omit<ProcessAlertSelection, 'version'>[])(
    'delega seleção e deduplicação ao servidor em preparar e declarar %j',
    async (selection) => {
      const input = {
        version: 3,
        ...selection,
      }
      const prepared = {
        alertId,
        version: 3,
        subject: alert.subject,
        body: alert.body,
        recipients: [recipient],
        copyText: 'Texto exato para copiar',
      }
      const declared = {
        ...alert,
        status: 'sent',
        recipients: [recipient],
        sentAt: '2026-11-03T12:00:00Z',
        sentBy: memberId,
        version: 4,
      }
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(json(prepared))
        .mockResolvedValueOnce(json(declared))
      const api = service(fetcher)
      expect((await api.prepareAlert(alertId, input)).data.copyText).toBe(
        prepared.copyText,
      )
      expect(fetcher).toHaveBeenCalledTimes(1)
      expect((await api.declareAlertSent(alertId, input)).data.status).toBe(
        'sent',
      )
      const requests = fetcher.mock.calls
      expect(String(requests[0][0])).toContain('/prepare/')
      expect(String(requests[1][0])).toContain('/declare-sent/')
      for (const [, request] of requests) {
        expect(JSON.parse(String(request?.body))).toEqual(input)
        expect(new Headers(request?.headers).get('X-CSRFToken')).toBe(
          'csrf-alert',
        )
        expect(request?.credentials).toBe('include')
      }
    },
  )

  it('registra cobrança usando sua versão sem enviar tarefa ou alterar progresso', async () => {
    const completed = {
      ...followUp,
      state: 'completed',
      completedAt: '2026-11-03T12:00:00Z',
      completedBy: memberId,
      version: 8,
    }
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json(completed))
    expect(
      (await service(fetcher).completeFollowUp(followUpId, 7)).data,
    ).toEqual(completed)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(String(fetcher.mock.calls[0][0])).toContain(
      `/process-follow-ups/${followUpId}/complete/`,
    )
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
      version: 7,
    })
    expect(
      new Headers(fetcher.mock.calls[0][1]?.headers).get('X-CSRFToken'),
    ).toBe('csrf-alert')
  })

  it('preserva registro humano quando cobrança é resolvida e aviso declarado termina', () => {
    const completedAt = '2026-11-03T12:00:00Z'
    expect(
      parseProcessFollowUp({
        ...followUp,
        state: 'resolved',
        completedAt,
        completedBy: memberId,
        resolvedAt: completedAt,
        resolution: 'return_or_reset',
      }).completedBy,
    ).toBe(memberId)
    expect(
      parseProcessAlert({
        ...alert,
        status: 'sent',
        recipients: [recipient],
        sentAt: completedAt,
        sentBy: memberId,
        resolvedAt: completedAt,
      }).status,
    ).toBe('sent')
  })

  it.each([400, 403, 404, 409, 429, 503])(
    'propaga HTTP %i e não declara automaticamente nem repete',
    async (status) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            type: 'about:blank',
            status,
            title: 'Falha',
            errors: { memberIds: ['Destinatário revogado.'] },
          }),
          {
            status,
            headers: {
              'Content-Type': 'application/problem+json',
              'Retry-After': '60',
            },
          },
        ),
      )
      await expect(
        service(fetcher).declareAlertSent(alertId, {
          version: 3,
          memberIds: [memberId],
        }),
      ).rejects.toMatchObject({
        status,
        retryAfter: '60',
        requestId: 'request-alert',
      })
      expect(fetcher).toHaveBeenCalledTimes(1)
    },
  )

  it('não aceita estado, origem de paginação ou resposta incompatível como lista vazia', async () => {
    expect(() => parseProcessAlert({ ...alert, status: 'delivered' })).toThrow(
      ProcessContractError,
    )
    expect(() => parseProcessFollowUp({ ...followUp, version: 0 })).toThrow(
      ProcessContractError,
    )
    expect(() => normalizeProcessFollowUpFilters({ pageSize: 101 })).toThrow(
      'pageSize',
    )
    expect(() =>
      normalizeProcessAlertFilters({ status: 'delivered' as never }),
    ).toThrow('status')
    expect(() =>
      normalizeProcessAlertRecipientFilters({ sector: 'other' as never }),
    ).toThrow('sector')
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      json({
        ...page(alert),
        next: 'https://other.example/api/v1/process-alerts/?page=2',
      }),
    )
    await expect(service(fetcher).alerts()).rejects.toMatchObject({
      name: 'ProcessContractError',
      requestId: 'response-alert',
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
