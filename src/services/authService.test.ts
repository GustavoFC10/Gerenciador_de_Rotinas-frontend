import { describe, expect, it, vi } from 'vitest'

import { AuthService, createAppUser, type AuthSession } from './authService'
import { ApiError, HttpClient } from './httpClient'

const sessionFixture: AuthSession = {
  user: {
    id: '0f35fd79-d00f-43cf-a201-f4a1029b02da',
    email: 'admin@example.com',
    isPlatformStaff: false,
  },
  memberships: [
    {
      id: '0e265be7-60bb-44f4-a2eb-afc1a2a01d40',
      displayName: 'Administrador',
      role: 'admin',
      status: 'active',
      organization: {
        id: 'fb330db7-bca4-4b1c-89f5-dc733cdbebaf',
        name: 'Jaral Contabilidade',
        slug: 'jaral-contabilidade',
        timezone: 'America/Sao_Paulo',
      },
    },
  ],
  activeMembership: null,
}

describe('AuthService', () => {
  it('emite o CSRF e restaura a sessão usando cookies', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-inicial' }))
      .mockResolvedValueOnce(jsonResponse(sessionFixture))
    const { client, service } = createService(fetchMock)

    await expect(service.initialize()).resolves.toEqual({
      session: sessionFixture,
      departmentAccesses: [],
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/auth/csrf/',
    )
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://api.example.com/api/v1/auth/session/',
    )
    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe('include')
    expect(fetchMock.mock.calls[1]?.[1]?.credentials).toBe('include')
    expect(client.getCsrfToken()).toBe('csrf-inicial')
  })

  it('trata uma sessão ausente como visitante não autenticado', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-inicial' }))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            type: 'about:blank',
            title: 'Não autenticado',
            status: 403,
          },
          403,
          'application/problem+json',
        ),
      )
    const { service } = createService(fetchMock)

    await expect(service.initialize()).resolves.toBeNull()
  })

  it('hidrata lead/contributor/viewer pelos departamentos visíveis do member', async () => {
    const memberMembership = {
      ...sessionFixture.memberships[0]!,
      role: 'member' as const,
    }
    const memberSession = {
      ...sessionFixture,
      memberships: [memberMembership],
      activeMembership: memberMembership,
    }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-inicial' }))
      .mockResolvedValueOnce(jsonResponse(memberSession))
      .mockResolvedValueOnce(
        jsonResponse({
          next: 'https://api.example.com/api/v1/departments/?page=2',
          results: [
            { id: 'dept-fiscal', accessRole: 'lead' },
            { id: 'dept-sem-acesso', accessRole: null },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          next: null,
          results: [{ id: 'dept-pessoal', accessRole: 'viewer' }],
        }),
      )
    const { service } = createService(fetchMock)

    await expect(service.initialize()).resolves.toEqual({
      session: memberSession,
      departmentAccesses: [
        { departmentId: 'dept-fiscal', role: 'lead' },
        { departmentId: 'dept-pessoal', role: 'viewer' },
      ],
    })
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      'https://api.example.com/api/v1/departments/?page=2',
    )
  })

  it('não expõe uma página HTML retornada por erro da API', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response('<!doctype html><h1>Bad Request</h1>', {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }),
    )
    const { service } = createService(fetchMock)

    const error = await service
      .initialize()
      .catch((currentError: unknown) => currentError)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ message: 'Bad Request', status: 400 })
    expect((error as Error).message).not.toContain('<!doctype')
  })

  it('envia o CSRF no login e guarda o token rotacionado', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-inicial' }))
      .mockResolvedValueOnce(
        jsonResponse({ ...sessionFixture, csrfToken: 'csrf-rotacionado' }),
      )
    const { client, service } = createService(fetchMock)

    await expect(
      service.login({
        email: '  admin@example.com  ',
        password: 'Senha-segura-2026!',
      }),
    ).resolves.toEqual({
      session: sessionFixture,
      departmentAccesses: [],
    })

    const loginRequest = fetchMock.mock.calls[1]?.[1]
    const headers = new Headers(loginRequest?.headers)
    expect(headers.get('X-CSRFToken')).toBe('csrf-inicial')
    expect(loginRequest?.credentials).toBe('include')
    expect(loginRequest?.body).toBe(
      JSON.stringify({
        email: 'admin@example.com',
        password: 'Senha-segura-2026!',
      }),
    )
    expect(client.getCsrfToken()).toBe('csrf-rotacionado')
  })

  it('aceita um convite com CSRF e o payload esperado', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-inicial' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const { client, service } = createService(fetchMock)

    await expect(
      service.acceptInvitation({
        token: 'token-recebido-por-email',
        password: 'Senha-segura-2026!',
        passwordConfirm: 'Senha-segura-2026!',
      }),
    ).resolves.toBeUndefined()

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/auth/csrf/',
    )
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://api.example.com/api/v1/auth/invitations/accept/',
    )

    const request = fetchMock.mock.calls[1]?.[1]
    const headers = new Headers(request?.headers)
    expect(request?.method).toBe('POST')
    expect(request?.credentials).toBe('include')
    expect(headers.get('X-CSRFToken')).toBe('csrf-inicial')
    expect(request?.body).toBe(
      JSON.stringify({
        token: 'token-recebido-por-email',
        password: 'Senha-segura-2026!',
        passwordConfirm: 'Senha-segura-2026!',
      }),
    )
    expect(client.getCsrfToken()).toBe('csrf-inicial')
  })

  it('seleciona a associação ativa no escopo da sessão', async () => {
    const selectedSession = {
      ...sessionFixture,
      activeMembership: sessionFixture.memberships[0]!,
    }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(selectedSession))
    const { client, service } = createService(fetchMock)
    client.setCsrfToken('csrf-atual')

    await expect(
      service.selectActiveMembership(sessionFixture.memberships[0]!.id),
    ).resolves.toEqual({
      session: selectedSession,
      departmentAccesses: [],
    })

    const request = fetchMock.mock.calls[0]?.[1]
    expect(request?.method).toBe('PUT')
    expect(new Headers(request?.headers).get('X-CSRFToken')).toBe('csrf-atual')
    expect(request?.body).toBe(
      JSON.stringify({ membershipId: sessionFixture.memberships[0]!.id }),
    )
  })

  it('encerra a sessão e descarta o CSRF mantido em memória', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const { client, service } = createService(fetchMock)
    client.setCsrfToken('csrf-atual')

    await expect(service.logout()).resolves.toBeUndefined()

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.example.com/api/v1/auth/logout/',
    )
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('X-CSRFToken'),
    ).toBe('csrf-atual')
    expect(client.getCsrfToken()).toBeNull()
  })

  it('preserva o Problem Details devolvido em uma falha de login', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'csrf-inicial' }))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            type: 'https://example.com/problems/invalid-credentials',
            title: 'Credenciais inválidas',
            status: 401,
            detail: 'E-mail ou senha incorretos.',
          },
          401,
          'application/problem+json',
        ),
      )
    const { service } = createService(fetchMock)

    const error = await service
      .login({ email: 'admin@example.com', password: 'incorreta' })
      .catch((currentError: unknown) => currentError)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 401,
      message: 'E-mail ou senha incorretos.',
    })
  })
})

describe('createAppUser', () => {
  it('preserva o cargo organizacional retornado pelo backend', () => {
    expect(
      createAppUser({
        session: {
          ...sessionFixture,
          activeMembership: sessionFixture.memberships[0]!,
        },
        departmentAccesses: [],
      }),
    ).toMatchObject({
      id: sessionFixture.user.id,
      membershipId: sessionFixture.memberships[0]!.id,
      name: 'Administrador',
      email: 'admin@example.com',
      role: 'admin',
    })
  })

  it('não cria usuário operacional antes da seleção de associação', () => {
    expect(
      createAppUser({ session: sessionFixture, departmentAccesses: [] }),
    ).toBeNull()
  })
})

function createService(fetchImplementation: typeof fetch) {
  const client = new HttpClient({
    baseUrl: 'https://api.example.com',
    fetchImplementation,
    requestIdFactory: () => 'request-id',
  })

  return { client, service: new AuthService(client) }
}

function jsonResponse(
  data: unknown,
  status = 200,
  contentType = 'application/json',
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': contentType },
  })
}
