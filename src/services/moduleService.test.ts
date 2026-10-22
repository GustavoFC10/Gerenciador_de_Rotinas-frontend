import { describe, expect, it, vi } from 'vitest'

import { HttpClient } from './httpClient'
import { ModuleService } from './moduleService'

function createService(fetchImplementation: typeof fetch) {
  const client = new HttpClient({
    baseUrl: 'https://api.example.com',
    fetchImplementation,
  })
  client.setCsrfToken('module-csrf')
  return new ModuleService(client)
}

describe('ModuleService', () => {
  it('loads authoritative permissions for the active membership', async () => {
    const permissions = {
      modules: [
        {
          module: 'processes',
          globalAccess: false,
          actions: ['read'],
          sectors: [
            { id: 'reg', name: 'Regularidade', role: 'reg', actions: ['read'] },
          ],
          executeSectors: ['reg'],
        },
      ],
    }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(permissions))
    await expect(createService(fetchMock).permissions()).resolves.toEqual(
      permissions,
    )
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/module-permissions/',
    )
  })

  it('grants an explicit process sector and job title without routine privileges', async () => {
    const input = {
      module: 'processes' as const,
      sector: 'reg',
      role: 'reg' as const,
      jobTitle: 'Analista de regularidade',
    }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json([input]))
    await expect(
      createService(fetchMock).grant('member-1', input),
    ).resolves.toEqual([input])
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/organization-members/member-1/module-accesses/',
    )
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PUT')
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify(input))
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('X-CSRFToken'),
    ).toBe('module-csrf')
  })

  it('revokes only the selected sector using the required JSON DELETE body', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }))
    await createService(fetchMock).revoke('member-1', {
      module: 'processes',
      sector: 'fin',
    })
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('DELETE')
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      '{"module":"processes","sector":"fin"}',
    )
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('X-CSRFToken'),
    ).toBe('module-csrf')
  })
})
