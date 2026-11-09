import { describe, expect, it, vi } from 'vitest'
import {
  makeProcessTestResource,
  processTestCatalog,
  processTestExtraIndicators,
  processTestLeggacyMetrics,
} from '../components/processes/processTestFixtures'
import type { ProcessFilters, ProcessSummary } from '../types/processes'
import { ApiError, HttpClient } from './httpClient'
import { ProcessContractError } from './processContract'
import { ProcessService } from './processService'

describe('ProcessService revision 2', () => {
  it('uses the returned deletion ETag for restore with CSRF and no request for the deleted detail', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, { status: 204, headers: { ETag: '"8"' } }),
      )
      .mockResolvedValueOnce(
        jsonResponse(makeProcessTestResource({ version: 9 })),
      )
    const service = createService(fetchImplementation)
    expect((await service.remove('process-1', 4)).etag).toBe('"8"')
    const restored = await service.restore('process-1', 8)
    expect(restored.data.version).toBe(9)
    const [url, request] = fetchImplementation.mock.calls[1]!
    expect(String(url)).toMatch(/\/processes\/process-1\/restore\/$/)
    expect(request?.method).toBe('POST')
    expect(JSON.parse(String(request?.body))).toEqual({ version: 8 })
    expect(new Headers(request?.headers).get('X-CSRFToken')).toBe('csrf-token')
    expect(fetchImplementation).toHaveBeenCalledTimes(2)
  })

  it.each([403, 404, 409, 429, 503])(
    'preserves restore HTTP %s without automatic mutation retries',
    async (status) => {
      const fetchImplementation = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(JSON.stringify({ status, title: 'Falha' }), {
            status,
            headers: {
              'Content-Type': 'application/problem+json',
              'Retry-After': '12',
            },
          }),
        )
      await expect(
        createService(fetchImplementation).restore('process-1', 8),
      ).rejects.toMatchObject({ status, retryAfter: '12' })
      expect(fetchImplementation).toHaveBeenCalledTimes(1)
    },
  )

  it('sends urgency and projection filters to the server and fetches global operational metrics', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              ...summaryFixture(),
              nextTask: {
                id: 't1',
                sector: 'fin',
                text: 'Atividade',
                stageTitle: 'Etapa',
              },
              pendingTaskCount: 2,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ count: 0, next: null, previous: null, results: [] }),
      )
      .mockResolvedValueOnce(jsonResponse(processTestLeggacyMetrics))
    const service = createService(fetchImplementation)
    await service.list({
      queueSector: 'fin',
      taskSector: 'fin',
      ordering: 'urgency',
      pageSize: 8,
    })
    await service.list({ otherSector: 'fin', ordering: 'urgency', pageSize: 6 })
    await service.leggacyMetrics()
    const first = new URL(String(fetchImplementation.mock.calls[0]![0]))
    expect(first.searchParams.get('taskSector')).toBe('fin')
    expect(first.searchParams.get('ordering')).toBe('urgency')
    const second = new URL(String(fetchImplementation.mock.calls[1]![0]))
    expect(second.searchParams.get('otherSector')).toBe('fin')
    expect(second.searchParams.has('queueSector')).toBe(false)
    const metrics = new URL(String(fetchImplementation.mock.calls[2]![0]))
    expect(metrics.pathname).toBe('/api/v1/processes/leggacy-metrics/')
    expect(metrics.searchParams.has('status')).toBe(false)
    expect(metrics.searchParams.has('taskSector')).toBe(false)
    expect(() =>
      service.list({ queueSector: 'fin', otherSector: 'fin' }),
    ).toThrow('Não combine')
    expect(() =>
      service.list({ ordering: 'invalid' } as unknown as ProcessFilters),
    ).toThrow('ordering')
  })

  it('sends only the six Outros fields even if a draft contains older type fields', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse(makeProcessTestResource({ tipo: 'outros' })),
      )
    await createService(fetchImplementation).create(
      {
        tipo: 'outros',
        empresa: 'Empresa',
        descricaoProcesso: 'Atividade',
        valorProcesso: '0.00',
        departamentoSolicitado: 'reg',
        acionarLeggacy: false,
        cnpj: '123',
        honorario: '150.00',
        regime: 'simples',
      },
      'outros:create',
    )
    expect(
      JSON.parse(String(fetchImplementation.mock.calls[0]?.[1]?.body)),
    ).toEqual({
      tipo: 'outros',
      empresa: 'Empresa',
      descricaoProcesso: 'Atividade',
      valorProcesso: '0.00',
      departamentoSolicitado: 'reg',
      acionarLeggacy: false,
    })
  })

  it('repete abertura com a mesma chave e preserva CSRF, corpo, versão e metadados', async () => {
    const detail = makeProcessTestResource()
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(detail, 201))
      .mockResolvedValueOnce(jsonResponse(detail))
    const service = createService(fetchImplementation)
    const input = {
      tipo: 'abertura' as const,
      empresa: 'Empresa Exemplo',
      companyId: '00000000-0000-4000-8000-000000000001',
      cnpj: '12345678000195',
      honorario: '1200.00',
      reunAlinh: false,
    }
    const first = await service.create(input, 'opening:unique-1')
    const replay = await service.create(input, 'opening:unique-1')
    expect(first.status).toBe(201)
    expect(replay.status).toBe(200)
    expect(replay.data).toEqual(first.data)
    expect(replay.requestId).toBe('response-process-test')
    expect(replay.etag).toBe('test-etag')
    for (const [, request] of fetchImplementation.mock.calls) {
      expect(new Headers(request?.headers).get('Idempotency-Key')).toBe(
        'opening:unique-1',
      )
      expect(new Headers(request?.headers).get('X-CSRFToken')).toBe(
        'csrf-token',
      )
      expect(JSON.parse(String(request?.body))).toEqual({
        tipo: 'abertura',
        honorario: '1200.00',
        reunAlinh: false,
        empresa: 'Empresa Exemplo',
        cnpj: '12345678000195',
      })
      expect(JSON.parse(String(request?.body))).not.toHaveProperty('companyId')
    }
  })

  it.each([
    'abertura',
    'mei',
    'outro',
    'alteracao',
    'inatividade',
    'inativa',
    'reativacao',
    'baixa',
    'saida',
    'exclusao',
  ] as const)(
    'uses free name/CNPJ for %s without a registry request',
    async (tipo) => {
      const fetchImplementation = vi
        .fn<typeof fetch>()
        .mockImplementation(async () =>
          jsonResponse(makeProcessTestResource({ tipo })),
        )
      const service = createService(fetchImplementation)
      await service.create(
        { tipo, empresa: ' Empresa livre ', cnpj: '00.ABC.123/0001-00' },
        'free-identity',
      )
      expect(fetchImplementation).toHaveBeenCalledTimes(1)
      expect(
        JSON.parse(String(fetchImplementation.mock.calls[0]?.[1]?.body)),
      ).toEqual({ tipo, empresa: 'Empresa livre', cnpj: '00.ABC.123/0001-00' })
      await service.update('process-1', {
        version: 4,
        empresa: 'Novo nome',
        cnpj: '',
      })
      expect(
        JSON.parse(String(fetchImplementation.mock.calls[1]?.[1]?.body)),
      ).toEqual({ version: 4, empresa: 'Novo nome', cnpj: '' })
    },
  )

  it('permite abertura sem CNPJ e exige o nome da empresa', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(makeProcessTestResource()))
    const service = createService(fetchImplementation)
    expect(() =>
      service.create({ tipo: 'abertura', empresa: '   ' }, 'opening:no-name'),
    ).toThrow('Informe o nome da empresa')
    expect(fetchImplementation).not.toHaveBeenCalled()

    await service.create(
      { tipo: 'abertura', empresa: ' Nova empresa ' },
      'opening:no-cnpj',
    )
    expect(
      JSON.parse(String(fetchImplementation.mock.calls[0]?.[1]?.body)),
    ).toEqual({
      tipo: 'abertura',
      empresa: 'Nova empresa',
      cnpj: '',
    })
  })

  it('recusa chaves inválidas antes de enviar uma abertura', () => {
    const fetchImplementation = vi.fn<typeof fetch>()
    const service = createService(fetchImplementation)
    for (const key of ['', 'chave com espaço']) {
      expect(() =>
        service.create({ tipo: 'abertura', empresa: 'Empresa' }, key),
      ).toThrow('chave de abertura')
    }
    expect(fetchImplementation).not.toHaveBeenCalled()
  })

  it('consulta uma única página com status repetidos, AND entre filtros e cancelamento', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        count: 70,
        next: 'https://api.example.com/api/v1/processes/?page=2',
        previous: null,
        results: [summaryFixture()],
      }),
    )
    const controller = new AbortController()
    const response = await createService(fetchImplementation).list(
      {
        status: ['atrasado', 'andamento', 'agendado', 'andamento'],
        responsibleSector: 'fin',
        q: ' Empresa & Filhos ',
        tipo: 'abertura',
        month: '2026-10',
        page: 1,
        pageSize: 20,
      },
      controller.signal,
    )
    const params = new URL(String(fetchImplementation.mock.calls[0]![0]))
      .searchParams
    expect(params.getAll('status')).toEqual([
      'agendado',
      'andamento',
      'atrasado',
    ])
    expect(params.get('responsibleSector')).toBe('fin')
    expect(params.get('q')).toBe('Empresa & Filhos')
    expect(params.get('pageSize')).toBe('20')
    expect(params.has('queueSector')).toBe(false)
    for (const removed of ['waiting', 'late', 'setor'])
      expect(params.has(removed)).toBe(false)
    expect(fetchImplementation).toHaveBeenCalledTimes(1)
    expect(fetchImplementation.mock.calls[0]![1]?.signal).toBe(
      controller.signal,
    )
    expect(response.data.count).toBe(70)
    expect(response.data.results[0]).not.toHaveProperty('tarefas')
    expect(response.data.results[0]).not.toHaveProperty('honorario')
  })

  it('recusa filtros antigos e repetição fora de status antes de enviar', () => {
    const fetchImplementation = vi.fn<typeof fetch>()
    const service = createService(fetchImplementation)
    expect(() =>
      service.list({ waiting: true } as unknown as ProcessFilters),
    ).toThrow('não suportado')
    expect(() =>
      service.list({
        responsibleSector: ['fin', 'reg'],
      } as unknown as ProcessFilters),
    ).toThrow('responsibleSector')
    expect(fetchImplementation).not.toHaveBeenCalled()
  })

  it('recusa URLs de paginação de outra origem sem segui-las', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        count: 51,
        next: 'https://evil.example/processes/?page=2',
        previous: null,
        results: [summaryFixture()],
      }),
    )
    await expect(
      createService(fetchImplementation).list(),
    ).rejects.toMatchObject({
      name: 'ProcessContractError',
      requestId: 'response-process-test',
    })
    expect(fetchImplementation).toHaveBeenCalledTimes(1)
  })

  it('busca detalhe separado sem arrays ilimitados e preserva campos omitidos', async () => {
    const detail = makeProcessTestResource({
      permissions: {
        ...processTestCatalog.permissions,
        viewFinancial: false,
        create: false,
      },
    })
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(detail))
    const response = await createService(fetchImplementation).get('process/1')
    expect(String(fetchImplementation.mock.calls[0]![0])).toMatch(
      /\/process%2F1\/$/,
    )
    expect(response.data).toEqual(detail)
    expect(response.data).not.toHaveProperty('honorario')
    expect(response.data).not.toHaveProperty('notas')
    expect(response.data).not.toHaveProperty('historico')
  })

  it('consulta entradas paginadas e nota retorna detalhe atualizado', async () => {
    const note = {
      id: 'note-1',
      por: 'member-1',
      autor: 'Ana',
      em: '2026-10-26T12:00:00Z',
      kind: 'note',
      financial: false,
      text: 'Contato realizado',
      details: null,
    }
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          count: 51,
          next: '/api/v1/processes/process-1/entries/?page=2',
          previous: null,
          results: [note],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(makeProcessTestResource({ version: 5 })),
      )
    const service = createService(fetchImplementation)
    expect(
      (
        await service.entries('process-1', {
          kind: 'note',
          page: 1,
          pageSize: 50,
        })
      ).data.results,
    ).toEqual([note])
    expect(
      new URL(String(fetchImplementation.mock.calls[0]![0])).searchParams.get(
        'kind',
      ),
    ).toBe('note')
    const result = await service.addNote('process-1', 4, note.text)
    expect(result.data.version).toBe(5)
    expect(result.data).not.toHaveProperty('notas')
    expect(fetchImplementation.mock.calls[1]![1]?.body).toBe(
      JSON.stringify({ version: 4, text: note.text }),
    )
  })

  it('consulta indicadores filtrados com os cinco estados, inclusive zero', async () => {
    const indicators = {
      ...processTestExtraIndicators,
      total: 3,
      active: 2,
      completed: 1,
      cancelled: 0,
      late: 1,
      waiting: 1,
      byStatus: {
        andamento: 0,
        agendado: 1,
        atrasado: 1,
        concluido: 1,
        cancelado: 0,
      },
      bySector: { fin: 1 },
      byType: { abertura: 3 },
    }
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(indicators))
    const result = await createService(fetchImplementation).indicators({
      status: ['agendado', 'atrasado'],
      month: '2026-10',
      responsibleSector: 'fin',
    })
    expect(result.data).toEqual(indicators)
    const url = new URL(String(fetchImplementation.mock.calls[0]![0]))
    expect(url.pathname).toBe('/api/v1/processes/indicators/')
    expect(url.searchParams.getAll('status')).toEqual(['agendado', 'atrasado'])
  })

  it('mantém decimais e valores indefinidos do relatório sem conversão local', async () => {
    const month = {
      month: '2026-10',
      gain: '9999999999999999999999.99',
      loss: '0.00',
      balance: '9999999999999999999999.99',
      missingValues: 1,
      entries: [
        {
          processId: 'process-1',
          empresa: 'Empresa',
          tipo: 'abertura',
          value: null,
        },
      ],
      exits: [],
      lossesByType: {},
    }
    const report = {
      ...month,
      previousMonth: { ...month, month: '2026-09' },
      history: [],
    }
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(report))
    expect(
      (await createService(fetchImplementation).monthlyReport('2026-10')).data,
    ).toEqual(report)
  })

  it.each([400, 403, 404, 409, 429, 503])(
    'propaga HTTP %i sem fallback nem repetição',
    async (status) => {
      const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({ type: 'about:blank', title: 'Falha', status }),
          {
            status,
            headers: {
              'Content-Type': 'application/problem+json',
              'Retry-After': '5',
            },
          },
        ),
      )
      const error = await createService(fetchImplementation)
        .update('process-1', { version: 3, protocolo: 'PROTO' })
        .catch((e) => e)
      expect(error).toBeInstanceOf(ApiError)
      expect(error).toMatchObject({ status, retryAfter: '5' })
      expect(fetchImplementation).toHaveBeenCalledTimes(1)
      expect(
        JSON.parse(String(fetchImplementation.mock.calls[0]![1]?.body)),
      ).toEqual({ version: 3, protocolo: 'PROTO' })
    },
  )

  it('rejeita resumo antigo ou enum desconhecido com request ID', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        count: 1,
        next: null,
        previous: null,
        results: [{ ...summaryFixture(), status: 'desconhecido' }],
      }),
    )
    await expect(
      createService(fetchImplementation).list(),
    ).rejects.toMatchObject({
      name: 'ProcessContractError',
      requestId: 'response-process-test',
    })
  })

  it('não ativa catálogo anterior nem transforma incompatibilidade em coleção vazia', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ ...processTestCatalog, contractVersion: 1 }),
      )
    await expect(
      createService(fetchImplementation).catalog(),
    ).rejects.toBeInstanceOf(ProcessContractError)
  })

  it.each([429, 503])(
    'respeita Retry-After de HTTP %i também ao navegar ou executar comandos',
    async (status) => {
      const instant = Date.parse('2026-10-29T12:00:00Z')
      const now = vi.spyOn(Date, 'now').mockReturnValue(instant)
      try {
        const fetchImplementation = vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({ type: 'about:blank', title: 'Aguarde', status }),
              {
                status,
                headers: {
                  'Content-Type': 'application/problem+json',
                  'Retry-After':
                    status === 429 ? '5' : 'Thu, 29 Oct 2026 12:00:05 GMT',
                },
              },
            ),
          )
          .mockResolvedValueOnce(jsonResponse(processTestCatalog))
        const service = createService(fetchImplementation)
        await expect(service.list()).rejects.toMatchObject({ status })
        await expect(service.get('p1')).rejects.toMatchObject({ status })
        await expect(service.cancel('p1', 1)).rejects.toMatchObject({ status })
        await expect(service.catalog()).rejects.toMatchObject({ status })
        expect(fetchImplementation).toHaveBeenCalledTimes(1)
        now.mockReturnValue(instant + 5000)
        expect((await service.catalog()).data.contractVersion).toBe(2)
        expect(fetchImplementation).toHaveBeenCalledTimes(2)
      } finally {
        now.mockRestore()
      }
    },
  )

  it('exclui com version no JSON e CSRF', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }))
    expect(
      (await createService(fetchImplementation).remove('process/1', 7)).status,
    ).toBe(204)
    const request = fetchImplementation.mock.calls[0]![1]
    expect(request?.method).toBe('DELETE')
    expect(request?.body).toBe('{"version":7}')
    expect(new Headers(request?.headers).get('X-CSRFToken')).toBe('csrf-token')
  })

  it.each(['feito', 'na', 'pending'] as const)(
    'envia comando de tarefa %s com versão',
    async (state) => {
      const fetchImplementation = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          jsonResponse(makeProcessTestResource({ version: 9 })),
        )
      await createService(fetchImplementation).transitionTask(
        'process-1',
        'ab/3',
        8,
        state,
      )
      expect(String(fetchImplementation.mock.calls[0]![0])).toMatch(
        /\/tasks\/ab%2F3\/transition\/$/,
      )
      expect(fetchImplementation.mock.calls[0]![1]?.body).toBe(
        JSON.stringify({ version: 8, state }),
      )
    },
  )
})

function summaryFixture(): ProcessSummary {
  const detail = makeProcessTestResource()
  const fields = [
    'id',
    'organizationId',
    'tipo',
    'codigo',
    'empresa',
    'companyId',
    'companyLinkRequired',
    'companyReference',
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
function createService(fetchImplementation: typeof fetch): ProcessService {
  const client = new HttpClient({
    baseUrl: 'https://api.example.com',
    fetchImplementation,
    requestIdFactory: () => 'request-process-test',
  })
  client.setCsrfToken('csrf-token')
  return new ProcessService(client)
}
function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': 'response-process-test',
      ETag: 'test-etag',
    },
  })
}
