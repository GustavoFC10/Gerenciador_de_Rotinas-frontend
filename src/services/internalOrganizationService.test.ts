import { describe, expect, it, vi } from 'vitest'

import {
  InternalOrganizationService,
  type InternalOrganizationDetailResource,
  type InternalOrganizationListResource,
} from './internalOrganizationService'
import { HttpClient } from './httpClient'

const organization: InternalOrganizationListResource = {
  id: 'organization-1',
  name: 'Organizacao Teste',
  slug: 'organizacao-teste',
  timezone: 'America/Sao_Paulo',
  status: 'active',
  memberCount: 4,
  departmentCount: 2,
  createdAt: '2026-09-02T12:00:00.000Z',
}

describe('InternalOrganizationService', () => {
  it('lists organizations and reads an organization detail', async () => {
    const detail: InternalOrganizationDetailResource = {
      ...organization,
      owners: [],
    }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse([organization]))
      .mockResolvedValueOnce(jsonResponse(detail))
    const { service } = createService(fetchMock)

    await expect(service.list()).resolves.toMatchObject({
      data: [organization],
    })
    await expect(service.get(organization.id)).resolves.toMatchObject({
      data: detail,
    })

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/internal/v1/organizations/',
    )
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `https://api.example.com/api/internal/v1/organizations/${organization.id}/`,
    )
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('GET')
    expect(fetchMock.mock.calls[1]?.[1]?.credentials).toBe('include')
  })

  it('provisions an organization with the owner and optional slug', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        organization,
        owner: {
          id: 'owner-1',
          email: 'owner@example.com',
          displayName: 'Owner Teste',
          role: 'owner',
          status: 'pending',
          joinedAt: null,
          invitation: null,
        },
        invitation: {
          id: 'invitation-1',
          email: 'owner@example.com',
          status: 'pending',
          expiresAt: '2026-09-09T12:00:00.000Z',
          createdAt: '2026-09-02T12:00:00.000Z',
        },
        delivery: 'sent',
      }),
    )
    const { client, service } = createService(fetchMock)
    client.setCsrfToken('csrf-token')

    await service.provision({
      name: organization.name,
      slug: organization.slug,
      timezone: organization.timezone,
      ownerName: 'Owner Teste',
      ownerEmail: 'owner@example.com',
    })

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/internal/v1/organizations/provision/',
    )
    const request = fetchMock.mock.calls[0]?.[1]
    expect(request?.method).toBe('POST')
    expect(request?.credentials).toBe('include')
    expect(new Headers(request?.headers).get('X-CSRFToken')).toBe('csrf-token')
    expect(request?.body).toBe(
      JSON.stringify({
        name: organization.name,
        slug: organization.slug,
        timezone: organization.timezone,
        ownerName: 'Owner Teste',
        ownerEmail: 'owner@example.com',
      }),
    )
  })

  it('adds an owner and resends a pending invitation', async () => {
    const invitation = {
      id: 'invitation-1',
      email: 'owner@example.com',
      status: 'pending',
      expiresAt: '2026-09-09T12:00:00.000Z',
      createdAt: '2026-09-02T12:00:00.000Z',
    }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(invitation, 201))
      .mockResolvedValueOnce(jsonResponse(invitation))
    const { client, service } = createService(fetchMock)
    client.setCsrfToken('csrf-token')

    await service.addOwner('organization/id', {
      name: 'Novo Owner',
      email: invitation.email,
    })
    await service.resendInvitation(invitation.id)

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/internal/v1/organizations/organization%2Fid/owners/',
    )
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ name: 'Novo Owner', email: invitation.email }),
    )
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `https://api.example.com/api/internal/v1/invitations/${invitation.id}/resend/`,
    )
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBeUndefined()
  })
})

function createService(fetchImplementation: typeof fetch) {
  const client = new HttpClient({
    baseUrl: 'https://api.example.com',
    fetchImplementation,
    requestIdFactory: () => 'request-id',
  })

  return { client, service: new InternalOrganizationService(client) }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
