import { describe, expect, it, vi } from 'vitest'

import { ApiError, HttpClient } from './httpClient'

describe('HttpClient error responses', () => {
  it('preserva os erros estruturados e os apresenta como mensagens de campo', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          type: 'about:blank',
          title: 'Requisição inválida',
          status: 400,
          errors: {
            password: [
              'Esta senha é muito curta. Ela deve conter pelo menos 8 caracteres.',
            ],
            passwordConfirm: ['As senhas não coincidem.'],
          },
        },
        400,
        {
          'Content-Type': 'application/problem+json',
          'X-Request-ID': 'api-request-400',
        },
      ),
    )
    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
      fetchImplementation,
      requestIdFactory: () => 'browser-request-400',
    })

    const error = await client
      .get('/api/v1/auth/invitations/accept/')
      .catch((currentError: unknown) => currentError)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      requestId: 'api-request-400',
      message:
        'Senha: Esta senha é muito curta. Ela deve conter pelo menos 8 caracteres. · Confirmação de senha: As senhas não coincidem.',
      problem: {
        errors: {
          password: [
            'Esta senha é muito curta. Ela deve conter pelo menos 8 caracteres.',
          ],
        },
      },
    })
  })

  it('usa uma mensagem segura para falhas temporárias e mantém o Request ID', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          type: 'about:blank',
          title: 'Serviço indisponível',
          status: 503,
          detail: 'database host db-01.internal refused the connection',
        },
        503,
        {
          'Content-Type': 'application/problem+json',
          'X-Request-ID': 'api-request-503',
        },
      ),
    )
    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
      fetchImplementation,
    })

    const error = await client
      .get('/api/v1/competence-calendar/')
      .catch((currentError: unknown) => currentError)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      requestId: 'api-request-503',
      message:
        'O serviço está indisponível temporariamente. Tente novamente em instantes.',
    })
  })
})

function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), { status, headers })
}
