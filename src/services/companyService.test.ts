import { describe, expect, it, vi } from 'vitest'
import { CompanyService } from './companyService'
import { HttpClient } from './httpClient'

function service(fetchImplementation: typeof fetch) {
  const client = new HttpClient({
    baseUrl: 'https://api.example.test',
    fetchImplementation,
  })
  client.setCsrfToken('company-csrf')
  return new CompanyService(client)
}
const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  })

describe('CompanyService contract', () => {
  it('usa status repetido e segue a paginação sem enviar includeArchived', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        json({
          count: 2,
          next: 'https://api.example.test/api/v1/client-companies/?page=2&status=active&status=archived',
          previous: null,
          results: [{ id: 'active', status: 'active' }],
        }),
      )
      .mockResolvedValueOnce(
        json({
          count: 2,
          next: null,
          previous: '?page=1',
          results: [{ id: 'archived', status: 'archived' }],
        }),
      )
    const result = await service(fetch).listAll(true)
    expect(result.map((company) => company.id)).toEqual(['active', 'archived'])
    const url = new URL(String(fetch.mock.calls[0]![0]))
    expect(url.searchParams.getAll('status')).toEqual(['active', 'archived'])
    expect(url.searchParams.has('includeArchived')).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('consulta ativas e oferece consulta paginada com nomes públicos', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () =>
        json({ count: 0, next: null, previous: null, results: [] }),
      )
    const api = service(fetch)
    await api.listAll()
    await api.list({
      status: ['archived'],
      ordering: '-legalName',
      pageSize: 20,
      search: 'Alfa',
    })
    expect(
      new URL(String(fetch.mock.calls[0]![0])).searchParams.getAll('status'),
    ).toEqual(['active'])
    const params = new URL(String(fetch.mock.calls[1]![0])).searchParams
    expect(params.get('ordering')).toBe('-legalName')
    expect(params.get('pageSize')).toBe('20')
    expect(params.get('search')).toBe('Alfa')
  })

  it('reutiliza a chave de criação e preserva CNPJ, null, CSRF e corpo', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async () => json({ id: 'company' }))
    const api = service(fetch)
    const input = { name: 'Alfa', code: null, cnpj: '12ABC34501DE35' }
    await api.create(input, 'company:create-1')
    await api.create(input, 'company:create-1')
    for (const [, request] of fetch.mock.calls) {
      expect(new Headers(request?.headers).get('Idempotency-Key')).toBe(
        'company:create-1',
      )
      expect(new Headers(request?.headers).get('X-CSRFToken')).toBe(
        'company-csrf',
      )
      expect(JSON.parse(String(request?.body))).toEqual(input)
    }
    expect(() => api.create(input, '')).toThrow('idempotência')
  })

  it('restaura com a versão da empresa e permite limpar o código reutilizado', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(json({ id: 'company' }))
    await service(fetch).restore('company', '"4"', { code: null })
    const [url, request] = fetch.mock.calls[0]!
    expect(String(url)).toContain('/client-companies/company/restore/')
    expect(new Headers(request?.headers).get('If-Match')).toBe('"4"')
    expect(JSON.parse(String(request?.body))).toEqual({ code: null })
  })
})
