import { describe, expect, it, vi } from 'vitest'
import { HttpClient, ApiError } from './httpClient'
import { HonorariosContractError, HonorariosService } from './honorariosService'
import type { HonorariosProfile } from '../types/honorarios'

const profile: HonorariosProfile = {
  regime: 'simples',
  segmento: 'servicos',
  inativa: false,
  funcionarios: 3,
  socios: 1,
  xml: 100,
  notas: 20,
  emiteNF: true,
  filiais: 0,
  filiaisInativas: 0,
  faturamento: '50000.00',
  usarHoras: false,
  horas: '0.00',
  servicos: [],
  anomalias: [],
}
const calculation = {
  total: '500.00',
  anual: '6500.00',
  tabela: '500.00',
  custo: '0.00',
  valorHoras: '0.00',
  ajuste: '0.00',
  linhas: [],
}
const clientRecord = {
  id: 'client-1',
  companyId: 'company-1',
  company: { id: 'company-1', name: 'Cliente', cnpj: '' },
  profile,
  version: 2,
  paramsVersion: 3,
  currentFee: '500.00',
  calculation,
  difference: '0.00',
  alignment: 'alinhado',
  adjustment: null,
}
const quoteRecord = {
  id: 'quote-1',
  number: '2026-001',
  revision: 1,
  version: 2,
  status: 'rascunho',
  snapshot: { profile, value: '500.00', plans: [], calculation },
}
function setup(responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>()
  for (const response of responses) fetchMock.mockResolvedValueOnce(response)
  const client = new HttpClient({
    baseUrl: 'https://api.example.com',
    fetchImplementation: fetchMock,
  })
  client.setCsrfToken('honorarios-csrf')
  return { service: new HonorariosService(client), fetchMock }
}
function json(data: unknown) {
  return Response.json({ data })
}

describe('HonorariosService', () => {
  it('uses the envelope, cookies, CSRF and AbortSignal for authoritative calculation', async () => {
    const result = { paramsVersion: 3, calculation, plans: [] }
    const { service, fetchMock } = setup([json(result)])
    const controller = new AbortController()
    await expect(
      service.calculate(profile, controller.signal),
    ).resolves.toEqual(result)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/honorarios/calculate/',
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify({ profile }),
    })
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('X-CSRFToken'),
    ).toBe('honorarios-csrf')
  })

  it('keeps the request UUID unchanged across quote creation retries', async () => {
    const { service, fetchMock } = setup([json(quoteRecord), json(quoteRecord)])
    const input = {
      requestId: 'ff4683de-c339-4672-8b80-e08c24b68be6',
      prospect: 'Interessado',
      profile,
      value: '500.00',
    }
    await service.createQuote(input)
    await service.createQuote(input)
    expect(
      fetchMock.mock.calls.map(
        (call) => JSON.parse(String(call[1]?.body)).requestId,
      ),
    ).toEqual([input.requestId, input.requestId])
  })

  it('sends only version/companyId for conversion and accepts the returned portfolio profile', async () => {
    const { service, fetchMock } = setup([json(clientRecord)])
    await expect(
      service.convertQuote('quote-1', {
        version: 2,
        companyId: 'company-1',
        value: '1.00',
      } as never),
    ).resolves.toMatchObject({ id: 'client-1' })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      version: 2,
      companyId: 'company-1',
    })
  })

  it('uses new versions after archiving/restoring and preserves preview versions for adjustment', async () => {
    const { service, fetchMock } = setup([
      json(clientRecord),
      json({ ...clientRecord, version: 3 }),
      json({ ...clientRecord, version: 4 }),
    ])
    const archived = await service.archiveClient('client-1', 1)
    const restored = await service.restoreClient('client-1', archived.version)
    await service.adjustClient('client-1', {
      version: restored.version,
      paramsVersion: 3,
      mode: 'indice',
    })
    expect(
      fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body))),
    ).toEqual([
      { version: 1 },
      { version: 2 },
      { version: 3, paramsVersion: 3, mode: 'indice' },
    ])
  })

  it('propagates version conflicts and never automatically repeats a financial command', async () => {
    const { service, fetchMock } = setup([
      Response.json(
        { type: 'conflict', title: 'Conflito', status: 409 },
        { status: 409 },
      ),
    ])
    await expect(
      service.adjustClient('client-1', {
        version: 2,
        paramsVersion: 3,
        mode: 'indice',
      }),
    ).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('uses real pagination/filters and rejects a malformed successful envelope', async () => {
    const { service, fetchMock } = setup([
      json({ count: 1, next: null, previous: null, results: [clientRecord] }),
      Response.json({ count: 0, results: [] }),
    ])
    await expect(
      service.clients({
        page: 2,
        pageSize: 10,
        alignment: 'abaixo',
        archived: false,
      }),
    ).resolves.toMatchObject({ count: 1, results: [{ id: 'client-1' }] })
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '2',
      pageSize: '10',
      alignment: 'abaixo',
      archived: 'false',
    })
    await expect(service.clients()).rejects.toBeInstanceOf(
      HonorariosContractError,
    )
  })

  it('loads proposal from the dedicated endpoint without recalculating', async () => {
    const { service, fetchMock } = setup([json(quoteRecord)])
    await expect(service.proposal('quote-1')).resolves.toEqual(quoteRecord)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/honorarios/quotes/quote-1/proposal/',
    )
  })

  it('exports CSV through the authenticated endpoint with active filters and no pagination', async () => {
    const csv = '\uFEFFcompanyId;nome;profile\r\ncompany-1;Cliente;{}\r\n'
    const { service, fetchMock } = setup([
      new Response(csv, {
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
      }),
    ])
    await expect(
      service.exportClients({
        q: 'Cliente',
        regime: 'simples',
        page: 2,
        pageSize: 10,
      }),
    ).resolves.toBe(csv)
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(url.pathname).toBe('/api/v1/honorarios/clients/export/')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      archived: 'false',
      q: 'Cliente',
      regime: 'simples',
    })
    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe('include')
  })

  it('imports one atomic batch and rejects larger requests before sending', async () => {
    const { service, fetchMock } = setup([
      json({ count: 1, ids: ['client-1'] }),
    ])
    const input = { companyId: 'company-1', profile, currentFee: '500.00' }
    await expect(service.importClients([input])).resolves.toEqual({
      count: 1,
      ids: ['client-1'],
    })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      rows: [input],
    })
    expect(() =>
      service.importClients(Array.from({ length: 1001 }, () => input)),
    ).toThrow('1000')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('normalizes DRF decimal ratios without converting monetary strings', async () => {
    const { service } = setup([
      json({
        paramsVersion: 3,
        year: 2026,
        clients: {
          current: '1000.01',
          byAlignment: { abaixo: 2 },
          adjustmentPlan: { maxIncreasePct: '10.00' },
        },
        quotes: { byStatus: { aceito: 3 }, acceptanceRate: '0.75' },
      }),
    ])
    await expect(service.dashboard(10)).resolves.toMatchObject({
      clients: {
        current: '1000.01',
        byAlignment: { abaixo: 2, alinhado: 0, acima: 0 },
        adjustmentPlan: { maxIncreasePct: 10 },
      },
      quotes: {
        byStatus: { aceito: 3, enviado: 0, rascunho: 0, recusado: 0 },
        acceptanceRate: 0.75,
      },
    })
  })
})
