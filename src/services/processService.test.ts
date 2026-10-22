import { describe, expect, it, vi } from 'vitest'

import { ApiError, HttpClient } from './httpClient'
import { ProcessService } from './processService'

describe('ProcessService', () => {
  it('repete uma abertura com a mesma chave sem alterar corpo nem confundir replay com falha', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ id: 'process-1', version: 1 }, 201))
      .mockResolvedValueOnce(jsonResponse({ id: 'process-1', version: 1 }, 200))
    const service = createService(fetchImplementation)
    const input = {
      tipo: 'abertura' as const,
      empresa: 'Empresa Exemplo',
      honorario: '1200.00',
      reunAlinh: false,
    }

    const first = await service.create(input, 'opening:unique-1')
    const replay = await service.create(input, 'opening:unique-1')

    expect(first.status).toBe(201)
    expect(replay.status).toBe(200)
    expect(replay.data.id).toBe(first.data.id)
    for (const [, request] of fetchImplementation.mock.calls) {
      const headers = new Headers(request?.headers)
      expect(headers.get('Idempotency-Key')).toBe('opening:unique-1')
      expect(headers.get('X-CSRFToken')).toBe('csrf-token')
      expect(request?.body).toBe(JSON.stringify(input))
    }
  })

  it('recusa chave inválida antes de enviar uma abertura sem proteção de idempotência', () => {
    const fetchImplementation = vi.fn<typeof fetch>()
    const service = createService(fetchImplementation)

    expect(() =>
      service.create({ tipo: 'abertura', empresa: 'Empresa' }, ''),
    ).toThrow('chave de abertura')
    expect(() =>
      service.create(
        { tipo: 'abertura', empresa: 'Empresa' },
        'chave com espaço',
      ),
    ).toThrow('chave de abertura')
    expect(fetchImplementation).not.toHaveBeenCalled()
  })

  it('propaga conflito de versão sem repetir a escrita com uma versão inventada', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: 'about:blank',
          title: 'Conflito de versão',
          detail: 'Recarregue o processo antes de reaplicar.',
          status: 409,
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/problem+json' },
        },
      ),
    )
    const service = createService(fetchImplementation)

    await expect(
      service.update('process-1', { version: 3, protocolo: 'PROTO-42' }),
    ).rejects.toMatchObject({ status: 409, name: 'ApiError' })
    expect(fetchImplementation).toHaveBeenCalledTimes(1)
    const request = fetchImplementation.mock.calls[0]?.[1]
    expect(JSON.parse(String(request?.body))).toEqual({
      version: 3,
      protocolo: 'PROTO-42',
    })
    expect(new Headers(request?.headers).has('If-Match')).toBe(false)
  })

  it('exclui com version no JSON e CSRF, preservando o contrato distinto de Rotinas', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }))

    const response = await createService(fetchImplementation).remove(
      'process/1',
      7,
    )

    expect(response.status).toBe(204)
    expect(fetchImplementation.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/processes/process%2F1/',
    )
    const request = fetchImplementation.mock.calls[0]?.[1]
    expect(request?.method).toBe('DELETE')
    expect(request?.body).toBe('{"version":7}')
    expect(new Headers(request?.headers).get('X-CSRFToken')).toBe('csrf-token')
  })

  it('segue a paginação do servidor e mantém filtros booleanos e cancelamento', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          count: 2,
          previous: null,
          next: 'https://api.example.com/api/v1/processes/?page=2&waiting=false',
          results: [{ id: 'process-1', empresa: 'Operacional' }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          count: 2,
          previous: 'https://api.example.com/api/v1/processes/',
          next: null,
          results: [{ id: 'process-2', empresa: 'Outra' }],
        }),
      )
    const controller = new AbortController()

    const results = await createService(fetchImplementation).listAll(
      { setor: 'reg', waiting: false, late: true, q: 'Empresa & Filhos' },
      controller.signal,
    )

    expect(results.map((process) => process.id)).toEqual([
      'process-1',
      'process-2',
    ])
    const query = new URL(String(fetchImplementation.mock.calls[0]?.[0]))
      .searchParams
    expect(Object.fromEntries(query)).toEqual({
      setor: 'reg',
      q: 'Empresa & Filhos',
      late: 'true',
      waiting: 'false',
    })
    expect(fetchImplementation.mock.calls[1]?.[0]).toBe(
      'https://api.example.com/api/v1/processes/?page=2&waiting=false',
    )
    for (const [, request] of fetchImplementation.mock.calls) {
      expect(request?.signal).toBe(controller.signal)
    }
    // A ausência de dados confidenciais continua ausência, nunca valor zero.
    expect(results[0]).not.toHaveProperty('honorario')
    expect(results[0]).not.toHaveProperty('obs')
  })

  it('mantém números decimais e valores não definidos do relatório sem conversão local', async () => {
    const report = {
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
      previousMonth: { month: '2026-09', gain: '0.00' },
      history: [],
    }
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(report))

    const response =
      await createService(fetchImplementation).monthlyReport('2026-10')

    expect(response.data).toEqual(report)
    expect(fetchImplementation.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/processes/reports/monthly/?month=2026-10',
    )
  })

  it('preserva tarefas efetivas, estados automáticos e metadados retornados pelo servidor', async () => {
    const process = {
      id: 'process-1',
      version: 8,
      etapas: [
        {
          t: 'Acompanhamento',
          index: 4,
          espera: 4,
          completed: false,
          tasks: [
            {
              id: 'ab13',
              d: 'fin',
              txt: 'Agendar reunião',
              reuniao: 'acompanhamento',
            },
          ],
        },
      ],
      tarefas: {
        ab3: {
          s: 'feito',
          auto: true,
          por: 'member-1',
          em: '2026-10-22T10:00:00Z',
        },
      },
      analysis: { waiting: true, releaseDate: '2027-02-22', currentStage: 0 },
    }
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(process))

    const response = await createService(fetchImplementation).get('process-1')

    expect(response.data).toEqual(process)
  })

  it('reabre tarefa com version e pending, deixando a validação de dependências ao servidor', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ id: 'process-1', version: 9 }))

    await createService(fetchImplementation).transitionTask(
      'process-1',
      'ab/3',
      8,
      'pending',
    )

    expect(fetchImplementation.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/processes/process-1/tasks/ab%2F3/transition/',
    )
    expect(fetchImplementation.mock.calls[0]?.[1]?.body).toBe(
      '{"version":8,"state":"pending"}',
    )
  })

  it('consulta indicadores com os mesmos filtros sem buscar dados financeiros', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        total: 1,
        active: 1,
        completed: 0,
        cancelled: 0,
        late: 0,
        waiting: 1,
        bySector: { reg: 1 },
        byType: { abertura: 1 },
      }),
    )

    const response = await createService(fetchImplementation).indicators({
      tipo: 'abertura',
      status: 'andamento',
      month: '2026-10',
      waiting: true,
    })

    expect(response.data.waiting).toBe(1)
    const requestUrl = new URL(String(fetchImplementation.mock.calls[0]?.[0]))
    expect(requestUrl.pathname).toBe('/api/v1/processes/indicators/')
    expect(Object.fromEntries(requestUrl.searchParams)).toEqual({
      tipo: 'abertura',
      status: 'andamento',
      waiting: 'true',
      month: '2026-10',
    })
  })

  it('tenta notificações pela operação própria sem recriar o processo nem ocultar estados incertos', async () => {
    const notifications = { pending: 0, sent: 2, uncertain: 1, skipped: 1 }
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse({ id: 'process-1', version: 5, notifications }),
      )

    const response = await createService(
      fetchImplementation,
    ).retryNotifications('process-1', 4)

    expect(response.data.notifications).toEqual(notifications)
    expect(fetchImplementation).toHaveBeenCalledTimes(1)
    expect(fetchImplementation.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/processes/process-1/notifications/retry/',
    )
    expect(fetchImplementation.mock.calls[0]?.[1]?.body).toBe('{"version":4}')
  })

  it('propaga revogação de acesso sem mascarar a resposta como uma lista vazia', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          title: 'Sem acesso',
          type: 'about:blank',
          status: 403,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/problem+json' },
        },
      ),
    )

    await expect(
      createService(fetchImplementation).catalog(),
    ).rejects.toBeInstanceOf(ApiError)
  })
})

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
    headers: { 'Content-Type': 'application/json' },
  })
}
